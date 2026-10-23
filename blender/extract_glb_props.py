"""Extract selected prop regions from a merged GLB and render each candidate."""

import math
import os

import bmesh
import bpy
from mathutils import Vector


SOURCE = os.environ.get("PREVIEW_GLB")
OUTPUT = os.environ.get("EXTRACT_OUTPUT")
IMAGE_DIR = os.environ.get("EXTRACT_IMAGE_DIR", "/private/tmp")

if not SOURCE or not OUTPUT:
    raise SystemExit("PREVIEW_GLB and EXTRACT_OUTPUT are required")

# Coordinates are in the imported GLB's world space. The storefront faces -Y.
REGIONS = {
    "plant_detail": (-0.318, -0.238, -0.330, -0.195, 0.045, 0.210),
    "vending_detail": (-0.238, -0.092, -0.345, -0.195, 0.045, 0.300),
    "freezer_detail": (-0.090, 0.060, -0.350, -0.195, 0.045, 0.205),
}

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=SOURCE)

source_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
for obj in source_meshes:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

prototype = source_meshes[0]
parts = []
for name, (x0, x1, y0, y1, z0, z1) in REGIONS.items():
    obj = prototype.copy()
    obj.data = prototype.data.copy()
    obj.name = name
    bpy.context.collection.objects.link(obj)

    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    faces = [
        face
        for face in bm.faces
        if not all(
            x0 <= vert.co.x <= x1
            and y0 <= vert.co.y <= y1
            and z0 <= vert.co.z <= z1
            for vert in face.verts
        )
    ]
    bmesh.ops.delete(bm, geom=faces, context="FACES")
    loose = [vert for vert in bm.verts if not vert.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj["exportable"] = True
    parts.append(obj)

for obj in source_meshes:
    bpy.data.objects.remove(obj, do_unlink=True)

# The source atlas contains the entire store. Keep enough resolution for the
# label and product details while avoiding four redundant 4K maps.
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    for node in material.node_tree.nodes:
        if node.type == "TEX_IMAGE" and node.image:
            image = node.image
            if max(image.size) > 2048:
                image.scale(2048, 2048)
            if not image.packed_file:
                image.pack()

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"

world = scene.world
world.use_nodes = True
background = world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
background.inputs["Strength"].default_value = 0.85

bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
ground = bpy.context.object
ground.name = "Preview floor"
ground_mat = bpy.data.materials.new("Preview floor material")
ground_mat.use_nodes = True
ground_bsdf = ground_mat.node_tree.nodes.get("Principled BSDF")
ground_bsdf.inputs["Base Color"].default_value = (0.94, 0.94, 0.94, 1.0)
ground_bsdf.inputs["Roughness"].default_value = 0.9
ground.data.materials.append(ground_mat)

for name, offset, energy, size in (
    ("Key", (-2.2, -2.8, 3.5), 520, 3.8),
    ("Fill", (2.6, -2.0, 2.3), 280, 3.2),
    ("Rim", (1.5, 2.7, 3.0), 340, 2.8),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.collection.objects.link(light)
    light.location = Vector(offset)
    light.rotation_euler = ((Vector((0, 0, 0.2)) - light.location).to_track_quat("-Z", "Y").to_euler())

camera_data = bpy.data.cameras.new("Prop camera")
camera = bpy.data.objects.new("Prop camera", camera_data)
bpy.context.collection.objects.link(camera)
scene.camera = camera
camera_data.type = "ORTHO"

for index, obj in enumerate(parts):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
    center = (low + high) * 0.5
    dimensions = high - low
    max_dimension = max(dimensions)
    print(
        "EXTRACTED",
        obj.name,
        "verts",
        len(obj.data.vertices),
        "faces",
        len(obj.data.polygons),
        "center",
        tuple(round(value, 5) for value in center),
        "dims",
        tuple(round(value, 5) for value in dimensions),
    )
    for other in parts:
        other.hide_render = other != obj
    ground.hide_render = True
    scene.render.film_transparent = True
    camera_data.ortho_scale = max_dimension * 1.28
    azimuth = math.radians(35)
    direction = Vector((math.sin(azimuth), -math.cos(azimuth), 0.28)).normalized()
    camera.location = center + direction * max_dimension * 4.0
    camera.rotation_euler = ((center - camera.location).to_track_quat("-Z", "Y").to_euler())
    scene.render.filepath = os.path.join(IMAGE_DIR, f"{obj.name}.png")
    bpy.ops.render.render(write_still=True)

for obj in parts:
    obj.hide_render = False

bpy.ops.object.select_all(action="DESELECT")
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_normals=True,
    export_texcoords=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)
print("EXTRACTED_GLB", OUTPUT)
