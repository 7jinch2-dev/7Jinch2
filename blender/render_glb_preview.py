"""Render four neutral inspection views of an arbitrary GLB asset."""

import math
import os

import bpy
from mathutils import Vector


SOURCE = os.environ.get("PREVIEW_GLB")
OUTPUT = os.environ.get(
    "PREVIEW_OUTPUT",
    "/private/tmp/glb-preview-front.png",
)
VIEW = os.environ.get("PREVIEW_VIEW", "threequarter")
FOCUS = os.environ.get("PREVIEW_FOCUS")

if not SOURCE:
    raise SystemExit("PREVIEW_GLB is required")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=SOURCE)

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if FOCUS:
    accessory_prefix = {
        "freezer": "Freezer ",
        "vending": "Vending ",
    }.get(FOCUS.split("_")[0])
    focus_objects = [
        obj for obj in mesh_objects
        if obj.name == FOCUS or
        (accessory_prefix and obj.name.startswith(accessory_prefix))
    ]
    if not focus_objects:
        raise RuntimeError(f"Focus object not found: {FOCUS}")
    for obj in mesh_objects:
        obj.hide_render = obj not in focus_objects
    mesh_objects = focus_objects
corners = [
    obj.matrix_world @ Vector(corner)
    for obj in mesh_objects
    for corner in obj.bound_box
]
low = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
high = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
center = (low + high) * 0.5
dimensions = high - low
max_dimension = max(dimensions)

world = bpy.context.scene.world
world.use_nodes = True
background = world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
background.inputs["Strength"].default_value = 0.75

bpy.ops.mesh.primitive_plane_add(size=max_dimension * 8, location=(center.x, center.y, low.z - 0.002))
ground = bpy.context.object
ground_mat = bpy.data.materials.new("Preview floor")
ground_mat.use_nodes = True
ground_bsdf = ground_mat.node_tree.nodes.get("Principled BSDF")
ground_bsdf.inputs["Base Color"].default_value = (0.94, 0.94, 0.94, 1.0)
ground_bsdf.inputs["Roughness"].default_value = 0.9
ground.data.materials.append(ground_mat)

for name, offset, energy, size in (
    ("Key", (-2.0, -2.5, 3.0), 620, 4.0),
    ("Fill", (2.5, -1.5, 2.0), 360, 3.5),
    ("Rim", (1.5, 2.5, 2.7), 420, 3.0),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size * max_dimension
    light = bpy.data.objects.new(name, light_data)
    bpy.context.collection.objects.link(light)
    light.location = center + Vector(offset) * max_dimension
    light.rotation_euler = ((center - light.location).to_track_quat("-Z", "Y").to_euler())

camera_data = bpy.data.cameras.new("Inspection camera")
camera = bpy.data.objects.new("Inspection camera", camera_data)
bpy.context.collection.objects.link(camera)
bpy.context.scene.camera = camera
camera_data.type = "ORTHO"
camera_data.ortho_scale = max_dimension * 1.28

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0.0

distance = max_dimension * 4.0
if VIEW == "front":
    direction = Vector((0.0, -1.0, 0.0))
    camera_data.ortho_scale = max_dimension * 1.08
elif VIEW == "right":
    direction = Vector((1.0, 0.0, 0.0))
elif VIEW == "top":
    direction = Vector((0.0, 0.0, 1.0))
else:
    elevation = math.radians(18)
    azimuth = math.radians(35)
    direction = Vector((
        math.cos(elevation) * math.sin(azimuth),
        -math.cos(elevation) * math.cos(azimuth),
        math.sin(elevation),
    ))
camera.location = center + direction * distance
camera.rotation_euler = ((center - camera.location).to_track_quat("-Z", "Y").to_euler())

scene.render.filepath = OUTPUT
bpy.ops.render.render(write_still=True)
print("PREVIEW_SOURCE", SOURCE)
print("PREVIEW_OUTPUT", OUTPUT)
print("PREVIEW_CENTER", tuple(round(value, 6) for value in center))
print("PREVIEW_DIMS", tuple(round(value, 6) for value in dimensions))
