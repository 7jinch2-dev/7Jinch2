import bpy
import os


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.environ.get(
    "VENDING_SOURCE",
    os.path.expanduser(
        "~/Downloads/4dc5eaf0338af1b6b666876a1fb93fe3.glb"
    ),
)
OUTPUT = os.path.join(ROOT_DIR, "blender", "source", "vending-optimized.glb")
TEXTURE_SIZE = int(os.environ.get("TEXTURE_SIZE", "2048"))
DECIMATE_RATIO = float(os.environ.get("DECIMATE_RATIO", "0.08"))
WEBP_QUALITY = int(os.environ.get("WEBP_QUALITY", "94"))


def main():
    if not os.path.exists(SOURCE):
        raise FileNotFoundError(SOURCE)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=SOURCE)

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("Vending source contains no meshes")

    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        modifier = obj.modifiers.new("Web decimation", "DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = DECIMATE_RATIO
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        print("VENDING_DECIMATED", len(obj.data.polygons), "faces")

    for image in bpy.data.images:
        if image.name in {"Render Result", "Viewer Node"}:
            continue
        if not image.size[0] or not image.size[1]:
            continue
        before = tuple(image.size)
        if max(before) > TEXTURE_SIZE:
            image.scale(TEXTURE_SIZE, TEXTURE_SIZE)
        image.file_format = "WEBP"
        if not image.packed_file:
            image.pack()
        print("VENDING_TEXTURE", image.name, before, "->", tuple(image.size))

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
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
    print("VENDING_READY", OUTPUT, f"{os.path.getsize(OUTPUT) / 1048576:.2f} MB")


if __name__ == "__main__":
    main()
