import bpy
import numpy as np
import os
import sys
from mathutils import Vector


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT_DIR, "blender", "output", "supplied_single_normalized.glb")
OUT_DIR = os.path.join(ROOT_DIR, "site", "assets", "models")
OUTPUT = os.path.join(OUT_DIR, "clerk-optimized.glb")
BLEND_OUTPUT = os.path.join(ROOT_DIR, "blender", "output", "clerk_refined.blend")
PREVIEW_DIR = os.path.join(ROOT_DIR, "blender", "output")
TEXTURE_SIZE = 2048
DECIMATE_RATIO = 0.15
WEBP_QUALITY = 95


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_character():
    if not os.path.exists(SOURCE):
        raise FileNotFoundError(
            f"{SOURCE} 不存在；请先运行 prepare_supplied_single_clerk.py 生成归一化模型。"
        )
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one character mesh, found {len(meshes)}")

    obj = meshes[0]
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def refine_character(obj):
    original_vertices = len(obj.data.vertices)
    original_faces = len(obj.data.polygons)

    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.update()

    modifier = obj.modifiers.new("Web decimation", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = DECIMATE_RATIO
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)

    print(
        "REFINED_GEOMETRY",
        original_vertices,
        "->",
        len(obj.data.vertices),
        "vertices;",
        original_faces,
        "->",
        len(obj.data.polygons),
        "faces; smooth shading enabled",
    )


def resize_textures():
    resized = []
    for image in bpy.data.images:
        if not image.size[0] or not image.size[1]:
            continue
        before = tuple(image.size)
        if max(before) <= TEXTURE_SIZE:
            continue
        image.scale(TEXTURE_SIZE, TEXTURE_SIZE)
        image.file_format = "PNG"
        if not image.packed_file:
            image.pack()
        resized.append((image.name, before, tuple(image.size)))

    for name, before, after in resized:
        print("TEXTURE", name, before, "->", after)


def box_blur(rgb, radius):
    height, width, channels = rgb.shape
    size = radius * 2 + 1
    padded = np.pad(rgb, ((radius, radius), (radius, radius), (0, 0)), mode="edge")
    integral = padded.cumsum(axis=0).cumsum(axis=1)
    integral = np.pad(integral, ((1, 0), (1, 0), (0, 0)))
    summed = (
        integral[size:size + height, size:size + width]
        - integral[:height, size:size + width]
        - integral[size:size + height, :width]
        + integral[:height, :width]
    )
    return summed / (size * size)


def smooth_skin_maps():
    for image in bpy.data.images:
        if not image.size[0] or not image.size[1]:
            continue
        name = image.name.lower()
        if name.endswith("_normal"):
            pixels = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
            image.pixels.foreach_get(pixels)
            rgba = pixels.reshape(image.size[1], image.size[0], 4)
            smoothed = box_blur(rgba[:, :, :3], 2)
            neutral = np.array((0.5, 0.5, 1.0), dtype=np.float32)
            rgba[:, :, :3] = smoothed * 0.55 + neutral * 0.45
            image.pixels.foreach_set(rgba.ravel())
            image.pack()
            print("SMOOTHED_NORMAL", image.name)
        elif name == "texture_pbr_20250901":
            pixels = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
            image.pixels.foreach_get(pixels)
            rgba = pixels.reshape(image.size[1], image.size[0], 4)
            smoothed = box_blur(rgba[:, :, :3], 1)
            rgba[:, :, :3] = rgba[:, :, :3] * 0.6 + smoothed * 0.4
            image.pixels.foreach_set(rgba.ravel())
            image.pack()
            print("DENOISED_BASE_COLOR", image.name)

    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == "NORMAL_MAP":
                node.inputs["Strength"].default_value = 0.35


def export_model(obj):
    os.makedirs(OUT_DIR, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_normals=True,
        export_tangents=False,
        export_texcoords=True,
        export_materials="EXPORT",
        export_image_format="WEBP",
        export_image_quality=WEBP_QUALITY,
        export_unused_images=False,
    )


def setup_preview():
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
        light.rotation_euler = (
            Vector((0, 0, 1.05)) - light.location
        ).to_track_quat("-Z", "Y").to_euler()

    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 2.35
    bpy.context.scene.camera = camera
    return camera


def render_preview(camera):
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
        camera.location = location
        camera.rotation_euler = (
            Vector((0, 0, 1.02)) - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(PREVIEW_DIR, f"clerk_refined_{name}.png")
        bpy.ops.render.render(write_still=True)


def main():
    clear_scene()
    obj = import_character()
    refine_character(obj)
    resize_textures()
    smooth_skin_maps()
    export_model(obj)
    if "--no-preview" not in sys.argv:
        camera = setup_preview()
        render_preview(camera)
        bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUTPUT)
    size_mb = os.path.getsize(OUTPUT) / (1024 * 1024)
    print("WEB_MODEL_READY", OUTPUT, f"{size_mb:.2f} MB")
    if "--no-preview" not in sys.argv:
        print("REFINED_BLEND_READY", BLEND_OUTPUT)


if __name__ == "__main__":
    main()
