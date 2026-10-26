"""Re-export current web models with quantized Meshopt geometry compression."""

import bpy
import os


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(ROOT_DIR, "site", "assets", "models")
CLERK_SOURCE = os.path.join(MODEL_DIR, "clerk-optimized.glb")
STORE_SOURCE = os.path.join(MODEL_DIR, "store-exterior.glb")
CLERK_OUTPUT = os.path.join(MODEL_DIR, "clerk-meshopt.glb")
STORE_OUTPUT = os.path.join(MODEL_DIR, "store-exterior-meshopt.glb")
TEXTURE_SIZE = int(os.environ.get("TEXTURE_SIZE", "512"))
WEBP_QUALITY = int(os.environ.get("WEBP_QUALITY", "80"))
CLERK_RATIO = float(os.environ.get("CLERK_RATIO", "0.8"))
STORE_RATIO = float(os.environ.get("STORE_RATIO", "0.62"))


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_model(path):
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    bpy.ops.import_scene.gltf(filepath=path)
    return [obj for obj in bpy.context.selected_objects if obj.type == "MESH"]


def shrink_images():
    for image in bpy.data.images:
        if image.name in {"Render Result", "Viewer Node"}:
            continue
        if not image.size[0] or not image.size[1]:
            continue
        if max(image.size) > TEXTURE_SIZE:
            image.scale(TEXTURE_SIZE, TEXTURE_SIZE)
        image.file_format = "WEBP"
        if not image.packed_file:
            image.pack()


def decimate(meshes, ratio):
    if ratio >= 0.999:
        return
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new("Mobile decimation", "DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def export(meshes, path):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
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
        export_cameras=False,
        export_lights=False,
        export_meshopt_compression_enable=True,
        export_meshopt_extension="EXT_meshopt_compression",
    )
    print("MESHOPT_MODEL", path, f"{os.path.getsize(path) / 1048576:.2f} MB")


def make_model(source, output, ratio):
    clear_scene()
    meshes = import_model(source)
    before = sum(len(obj.data.polygons) for obj in meshes)
    decimate(meshes, ratio)
    after = sum(len(obj.data.polygons) for obj in meshes)
    shrink_images()
    export(meshes, output)
    print("MESHOPT_FACES", before, "->", after)


if __name__ == "__main__":
    make_model(CLERK_SOURCE, CLERK_OUTPUT, CLERK_RATIO)
    make_model(STORE_SOURCE, STORE_OUTPUT, STORE_RATIO)
