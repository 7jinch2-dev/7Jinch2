import bpy
import os
from mathutils import Vector


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.environ.get(
    "SUPPLIED_GLB",
    os.path.join(ROOT_DIR, "blender", "source", "supplied_single_clerk.glb"),
)


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=SOURCE)

print("OBJECT_COUNT", len(bpy.context.scene.objects))
for obj in sorted(bpy.context.scene.objects, key=lambda item: item.name):
    if obj.type not in {"MESH", "EMPTY", "ARMATURE"}:
        continue
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    if corners:
        low = Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners)))
        high = Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners)))
        dims = high - low
        center = (low + high) * 0.5
        print(
            "OBJ",
            obj.name,
            obj.type,
            "center",
            tuple(round(value, 4) for value in center),
            "dims",
            tuple(round(value, 4) for value in dims),
            "verts",
            len(obj.data.vertices) if obj.type == "MESH" else 0,
        )

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
for obj in mesh_objects:
    print("MATERIALS", obj.name, [slot.material.name if slot.material else None for slot in obj.material_slots])
    for slot in obj.material_slots:
        mat = slot.material
        if not mat or not mat.use_nodes:
            continue
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        base = bsdf.inputs.get("Base Color") if bsdf else None
        linked = [link.from_node.name for link in base.links] if base and base.is_linked else []
        print(
            "MATERIAL",
            mat.name,
            "base",
            tuple(round(value, 4) for value in base.default_value) if base else None,
            "linked",
            linked,
        )
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                print(
                    "TEXTURE",
                    node.name,
                    node.image.name,
                    tuple(node.image.size),
                    "packed",
                    bool(node.image.packed_file),
                    "source",
                    node.image.source,
                    "filepath",
                    node.image.filepath,
                )
    world_x = [(obj.matrix_world @ vertex.co).x for vertex in obj.data.vertices]
    low_x, high_x = min(world_x), max(world_x)
    bins = [0] * 40
    for value in world_x:
        index = min(39, max(0, int((value - low_x) / (high_x - low_x) * 40)))
        bins[index] += 1
    print("X_RANGE", round(low_x, 5), round(high_x, 5))
    for index, count in enumerate(bins):
        start = low_x + (high_x - low_x) * index / 40
        end = low_x + (high_x - low_x) * (index + 1) / 40
        print("X_BIN", index, round(start, 4), round(end, 4), count)
