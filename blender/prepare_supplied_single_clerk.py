import bpy
import os
from mathutils import Vector


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT_DIR, "blender", "source", "supplied_single_clerk.glb")
OUT_DIR = os.path.join(ROOT_DIR, "blender", "output")
os.makedirs(OUT_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_character():
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one character mesh, found {len(meshes)}")
    obj = meshes[0]
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    points = [vertex.co.copy() for vertex in obj.data.vertices]
    min_x = min(point.x for point in points)
    max_x = max(point.x for point in points)
    min_y = min(point.y for point in points)
    max_y = max(point.y for point in points)
    min_z = min(point.z for point in points)
    max_z = max(point.z for point in points)
    center_x = (min_x + max_x) * 0.5
    center_y = (min_y + max_y) * 0.5
    scale = 2.0 / max(max_z - min_z, 1e-6)

    for vertex in obj.data.vertices:
        vertex.co.x = (vertex.co.x - center_x) * scale
        vertex.co.y = (vertex.co.y - center_y) * scale
        vertex.co.z = (vertex.co.z - min_z) * scale
    obj.data.update()
    obj.name = "Clerk_ChenZhixi_Textured"
    return obj


def add_preview():
    world = bpy.context.scene.world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.008, 0.011, 0.016, 1)
    background.inputs["Strength"].default_value = 0.28

    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
    ground = bpy.context.object
    ground.name = "PreviewGround"
    ground_mat = bpy.data.materials.new("PreviewGroundMaterial")
    ground_mat.use_nodes = True
    ground_bsdf = ground_mat.node_tree.nodes.get("Principled BSDF")
    ground_bsdf.inputs["Base Color"].default_value = (0.012, 0.016, 0.022, 1)
    ground_bsdf.inputs["Roughness"].default_value = 0.88
    ground.data.materials.append(ground_mat)

    for name, location, energy, size in (
        ("Key", (2.7, -4.0, 4.0), 800, 4.0),
        ("Fill", (-3.0, -2.5, 2.4), 450, 3.0),
        ("Rim", (0.0, 3.0, 3.5), 700, 3.0),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        bpy.context.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (Vector((0, 0, 1.05)) - light.location).to_track_quat("-Z", "Y").to_euler()

    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 2.35
    bpy.context.scene.camera = camera
    return camera


def point_camera(camera, location, target=(0, 0, 1.02)):
    camera.location = location
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_views(camera):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    for name, location in {
        "front": (0, -6.0, 1.08),
        "side": (5.5, 0, 1.08),
        "back": (0, 6.0, 1.08),
        "threequarter": (3.9, -5.2, 2.1),
    }.items():
        point_camera(camera, location)
        scene.render.filepath = os.path.join(OUT_DIR, f"supplied_single_{name}.png")
        bpy.ops.render.render(write_still=True)


def save_and_export(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT_DIR, "supplied_single_normalized.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
    )
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR, "supplied_single_clerk.blend"))


def main():
    clear_scene()
    obj = import_character()
    camera = add_preview()
    save_and_export(obj)
    render_views(camera)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR, "supplied_single_clerk.blend"))
    print("SUPPLIED_SINGLE_READY", obj.name, len(obj.data.vertices))


if __name__ == "__main__":
    main()
