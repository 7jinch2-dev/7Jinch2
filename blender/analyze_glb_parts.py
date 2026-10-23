"""Split a merged GLB into loose geometry islands and print their bounds."""

import os

import bpy
from mathutils import Vector


SOURCE = os.environ.get("PREVIEW_GLB")
MIN_VERTICES = int(os.environ.get("MIN_VERTICES", "32"))

if not SOURCE:
    raise SystemExit("PREVIEW_GLB is required")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=SOURCE)

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
for obj in mesh_objects:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)

parts = []
for obj in bpy.context.scene.objects:
    if obj.type != "MESH" or len(obj.data.vertices) < MIN_VERTICES:
        continue
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
    dims = high - low
    parts.append((
        len(obj.data.vertices),
        len(obj.data.polygons),
        tuple(round(value, 5) for value in ((low + high) * 0.5)),
        tuple(round(value, 5) for value in dims),
        tuple(round(value, 5) for value in low),
        tuple(round(value, 5) for value in high),
    ))

parts.sort(key=lambda item: (-item[0], -max(item[3])))
print("PART_COUNT", len(parts))
for index, part in enumerate(parts):
    print(
        "PART",
        index,
        "verts",
        part[0],
        "faces",
        part[1],
        "center",
        part[2],
        "dims",
        part[3],
        "low",
        part[4],
        "high",
        part[5],
    )
