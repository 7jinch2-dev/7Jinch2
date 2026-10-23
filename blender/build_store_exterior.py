import bpy
import math
import os
import sys
from mathutils import Vector


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT_DIR, "blender", "output")
RENDER_DIR = os.path.join(ROOT_DIR, "concepts", "store", "blender")
GLB_PATH = os.path.join(ROOT_DIR, "site", "assets", "models", "store-exterior.glb")
BLEND_PATH = os.path.join(OUTPUT_DIR, "store_exterior.blend")
PROPS_PATH = os.path.join(ROOT_DIR, "blender", "source", "store-props.glb")
VENDING_PATH = os.path.join(ROOT_DIR, "blender", "source", "vending-optimized.glb")
FREEZER_PATH = os.path.join(ROOT_DIR, "blender", "source", "freezer-optimized.glb")
FONT_PATH = "/System/Library/Fonts/STHeiti Medium.ttc"
QUICK = "--quick" in sys.argv
NO_PREVIEW = "--no-preview" in sys.argv
WEBP_QUALITY = 86


def srgb(hex_color):
    value = hex_color.lstrip("#")
    rgb = [int(value[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]

    def linear(channel):
        if channel <= 0.04045:
            return channel / 12.92
        return ((channel + 0.055) / 1.055) ** 2.4

    return tuple(linear(channel) for channel in rgb)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.materials,
        bpy.data.curves,
        bpy.data.meshes,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_material(name, color, roughness=0.65, metallic=0.0, emission=0.0,
                  noise_scale=0.0, noise_strength=0.0, wear_color=None, brick=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*srgb(color), 1.0)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*srgb(color), 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission > 0:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*srgb(color), 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission
        elif "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = (*srgb(color), 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission

    tex = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 1.0, 1.0)
    links.new(tex.outputs["Object"], mapping.inputs["Vector"])

    if brick:
        bricks = nodes.new("ShaderNodeTexBrick")
        bricks.inputs["Color1"].default_value = (*srgb("#e1d8c5"), 1)
        bricks.inputs["Color2"].default_value = (*srgb("#d4c9b5"), 1)
        bricks.inputs["Mortar"].default_value = (*srgb("#b8ad9d"), 1)
        bricks.inputs["Scale"].default_value = 1.0
        bricks.inputs["Mortar Size"].default_value = 0.012
        bricks.inputs["Mortar Smooth"].default_value = 0.2
        bricks.inputs["Brick Width"].default_value = 0.72
        bricks.inputs["Row Height"].default_value = 0.56
        links.new(mapping.outputs["Vector"], bricks.inputs["Vector"])
        links.new(bricks.outputs["Color"], bsdf.inputs["Base Color"])
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.13
        bump.inputs["Distance"].default_value = 0.018
        links.new(bricks.outputs["Color"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    elif noise_scale > 0:
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = noise_scale
        noise.inputs["Detail"].default_value = 5.0
        noise.inputs["Roughness"].default_value = 0.68
        links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
        if wear_color:
            ramp = nodes.new("ShaderNodeValToRGB")
            ramp.color_ramp.elements[0].position = 0.30
            ramp.color_ramp.elements[0].color = (*srgb(color), 1)
            ramp.color_ramp.elements[1].position = 0.86
            ramp.color_ramp.elements[1].color = (*srgb(wear_color), 1)
            links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
            links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = noise_strength
        bump.inputs["Distance"].default_value = 0.025
        links.new(noise.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def add_box(name, size, location, material, bevel=0.0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Soft bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        modifier.limit_method = "ANGLE"
    obj.data.materials.append(material)
    obj["exportable"] = True
    return obj


def add_cylinder(name, radius, depth, location, material, vertices=32,
                 rotation=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    if bevel > 0:
        modifier = obj.modifiers.new("Soft bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(material)
    obj["exportable"] = True
    return obj


def add_text(name, body, location, size, material, font, rotation=(math.pi / 2, 0, 0),
             extrude=0.0015, weight=0.0, align_x="CENTER", align_y="CENTER"):
    data = bpy.data.curves.new(name + "Curve", type="FONT")
    data.body = body
    data.font = font
    data.size = size
    data.align_x = align_x
    data.align_y = align_y
    data.extrude = extrude
    data.offset = weight
    data.resolution_u = 2
    data.bevel_depth = 0.001
    data.bevel_resolution = 1
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    obj["exportable"] = True
    return obj


def add_plane(name, size, location, material, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    obj["exportable"] = True
    return obj


def add_leaf(name, location, scale, rotation, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(material)
    obj["exportable"] = True
    return obj


def place_detail_props():
    """Replace the three primitive props with the more detailed extracted set."""
    bpy.ops.import_scene.gltf(filepath=PROPS_PATH)
    imported = list(bpy.context.selected_objects)
    placements = {
        "plant_detail": (7.20, -2.76, 0.34),
    }
    replacements = {}
    for obj in imported:
        if obj.type != "MESH":
            continue
        base_name = obj.name.split(".")[0]
        if base_name not in placements:
            continue
        scale, target_x, ground_z = placements[base_name]
        obj.scale = (scale, scale, scale)
        bpy.context.view_layer.update()
        corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        low = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
        high = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
        center = (low + high) * 0.5
        obj.location.x += target_x - center.x
        obj.location.y += -2.54 - center.y
        obj.location.z += ground_z - low.z
        obj.name = base_name.replace("_detail", "_source")
        obj["exportable"] = True
        replacements[base_name] = obj
    missing = sorted(set(placements) - set(replacements))
    if missing:
        raise RuntimeError(f"Missing extracted store props: {missing}")
    return replacements


def place_imported_prop(path, name, target_x, target_y, ground_z, scale):
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [obj for obj in bpy.context.selected_objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"Optimized prop contains no meshes: {path}")

    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        obj.scale = (scale, scale, scale)
        bpy.context.view_layer.update()
        corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        low = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
        high = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
        center = (low + high) * 0.5
        obj.location.x += target_x - center.x
        obj.location.y += target_y - center.y
        obj.location.z += ground_z - low.z
        obj["exportable"] = True
        obj.select_set(False)

    meshes[0].name = name
    print("PROP_PLACED", name, len(meshes[0].data.polygons), "faces")


def make_scene():
    clear_scene()
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(RENDER_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)

    # Palette follows the supplied reference: warm ivory ceramics, saturated
    # vermilion signage and a deep green enamel frame.
    wall = make_material("Cream ceramic tile", "#e8ddca", 0.8)
    wall_plain = make_material("Cream wall backup", "#e4d8c3", 0.88)
    trim = make_material("Deep green enamel", "#172e2a", 0.55, 0.18)
    trim_light = make_material("Green frame highlight", "#2c4a43", 0.48, 0.16)
    cream = make_material("Warm cream enamel", "#f4e7cf", 0.55)
    sign_cream = make_material("Backlit cream sign", "#f5e2b8", 0.46, emission=0.24)
    red = make_material("Vermilion sign letters", "#981b1c", 0.5)
    awning = make_material("Weathered red canvas", "#8c302a", 0.82)
    sidewalk = make_material("Grey stone base", "#737477", 0.9)
    sidewalk_line = make_material("Stone joint", "#5b5c5e", 0.94)
    wall_joint = make_material("Wall tile joint", "#c4b6a2", 0.9)
    glass = make_material("Smoked shop glass", "#a8b5ae", 0.12, metallic=0.03)
    glass_blend = glass.node_tree.nodes.get("Principled BSDF")
    if "Transmission Weight" in glass_blend.inputs:
        glass_blend.inputs["Transmission Weight"].default_value = 0.78
    glass_blend.inputs["Alpha"].default_value = 0.20
    glass.diffuse_color = (*srgb("#a3b4ae"), 0.20)
    chalkboard = make_material("Chalkboard", "#202524", 0.9)
    chalk = make_material("Chalk", "#eee5cc", 0.62, emission=0.08)
    lamp_frame = make_material("Streetlight green", "#173733", 0.54, 0.16)
    lamp_glow = make_material("Lamp glow", "#ffbd45", 0.42, emission=2.8)
    soft_glow = make_material("Warm shop spill", "#ffc271", 0.35, emission=2.0)
    black = make_material("Rubber black", "#171c1b", 0.68)
    font = bpy.data.fonts.load(FONT_PATH)

    # Model footprint and sidewalk.
    add_box("Foundation shadow base", (8.35, 5.2, 0.16), (-0.425, 0, 0.08), black, 0.08)
    add_box("Sidewalk slab", (8.05, 4.65, 0.20), (-0.44, -0.16, 0.22), sidewalk, 0.10)
    tile_w, tile_d = 0.88, 1.08
    # One extra column on the left fully supports the streetlight foot.
    for ix in range(-1, 8):
        for iy in range(4):
            x = -3.08 + ix * tile_w
            y = -2.06 + iy * tile_d
            if x > 3.12:
                continue
            add_box(f"Sidewalk tile {ix}-{iy}", (tile_w - 0.025, tile_d - 0.025, 0.035),
                    (x, y, 0.335), sidewalk, 0.025)
    add_box("Front curb", (8.23, 0.34, 0.30), (-0.44, -2.55, 0.19), sidewalk, 0.10)

    # Building volume. Front faces negative Y.
    add_box("Back wall", (5.40, 0.16, 3.38), (0, 1.94, 1.94), wall, 0.035)
    add_box("Left wall", (0.16, 4.00, 3.38), (-2.62, 0, 1.94), wall, 0.035)
    add_box("Right wall", (0.16, 4.00, 3.38), (2.62, 0, 1.94), wall, 0.035)
    add_box("Upper front fascia", (5.38, 0.16, 1.38), (0, -1.92, 2.88), wall, 0.035)
    add_box("Interior floor", (5.22, 3.85, 0.08), (0, 0, 0.39), wall_plain, 0.02)
    add_box("Interior back wall", (5.20, 0.06, 3.25), (0, 1.82, 1.93), wall_plain, 0.015)
    add_box("Interior ceiling", (5.22, 3.82, 0.07), (0, 0, 2.49), cream, 0.02)

    # Structural frame and roof cap.
    add_box("Roof crown front", (5.72, 0.38, 0.30), (0, -1.98, 3.74), trim, 0.10)
    add_box("Roof crown right", (0.38, 4.28, 0.30), (2.63, 0, 3.74), trim, 0.10)
    add_box("Roof crown back", (5.72, 0.38, 0.30), (0, 1.99, 3.74), trim, 0.10)
    add_box("Roof cover", (5.48, 4.18, 0.12), (0, 0, 3.61), trim, 0.06)
    for x in (-2.53, 2.53):
        add_box(f"Front corner post {x}", (0.22, 0.22, 3.25), (x, -1.98, 2.00), trim, 0.08)
    for y in (-1.82, 1.92):
        add_box(f"Right corner post {y}", (0.22, 0.22, 3.25), (2.62, y, 2.00), trim, 0.08)
    add_box("Right mid rail", (0.12, 4.04, 0.15), (2.70, 0, 2.83), trim, 0.035)
    add_box("Back mid rail", (5.40, 0.12, 0.15), (0, 2.03, 2.83), trim, 0.035)

    # Tile joints visible on side and back.
    for z in (0.76, 1.30, 1.84, 2.38, 2.92, 3.46):
        add_box(f"Right tile joint {z}", (0.006, 3.82, 0.007), (2.706, 0, z), wall_joint, 0)
        add_box(f"Back tile joint {z}", (5.18, 0.006, 0.007), (0, 2.026, z), wall_joint, 0)
    for y in (-1.55, -0.95, -0.35, 0.25, 0.85, 1.45):
        add_box(f"Right vertical tile joint {y}", (0.006, 0.007, 3.08), (2.706, y, 1.94), wall_joint, 0)
    for x in (-2.05, -1.35, -0.65, 0.05, 0.75, 1.45, 2.15):
        add_box(f"Back vertical tile joint {x}", (0.007, 0.006, 3.08), (x, 2.026, 1.94), wall_joint, 0)

    # Storefront frame and full-height double doors. The double-door bay sits
    # to the right of centre, leaving the left display window and counter clear.
    door_shift = 1.15
    add_box("Storefront top rail", (5.12, 0.18, 0.12), (0, -1.92, 2.46), trim, 0.035)
    add_box("Storefront threshold", (5.12, 0.20, 0.10), (0, -1.94, 0.42), trim, 0.025)
    for x in (-2.48, -0.10, door_shift, 2.43):
        add_box(f"Storefront mullion {x}", (0.075, 0.16, 2.04), (x, -1.92, 1.44), trim, 0.02)
    for x0, x1, name in (
        (-2.40, -0.13, "Left glass"),
        (-0.07, 1.11, "Left door"),
        (1.19, 2.37, "Right door"),
    ):
        add_box(name, (x1 - x0, 0.025, 1.94), ((x0 + x1) / 2, -1.985, 1.45),
                glass, 0.0)
    for x in (door_shift - 0.16, door_shift + 0.16):
        add_cylinder(f"Door handle {x}", 0.022, 0.46, (x, -2.055, 1.18), black,
                     vertices=24, bevel=0.006)
        add_box(f"Door handle mount {x}", (0.06, 0.05, 0.035), (x, -2.035, 1.18), black, 0.006)
    add_box("Door center latch", (0.04, 0.075, 0.15),
            (door_shift, -2.045, 1.12), black, 0.008)
    add_box("Inner glass darkness", (4.85, 0.02, 1.83), (0, 1.63, 1.42), wall_plain, 0.0)
    for x in (-1.25, -0.15, 0.55, 1.5):
        add_box(f"Interior ceiling light {x}", (0.48, 0.05, 0.025), (x, 1.31, 2.37),
                soft_glow, 0.008)

    # Main illuminated sign.
    add_box("Main sign frame", (5.48, 0.18, 1.10), (0, -2.105, 3.04), trim, 0.10)
    add_box("Main sign inset", (5.15, 0.035, 0.90), (0, -2.205, 3.04), sign_cream, 0.065)
    add_box("Main sign inset border", (5.20, 0.025, 0.95), (0, -2.185, 3.04), trim, 0.08)
    add_text("Main sign title", "販賣 · 靈感", (0, -2.232, 3.19), 0.62, red, font, weight=0.005)
    add_text("Main sign subtitle", "24H  靈感便利店", (0, -2.232, 2.79), 0.18, trim_light, font, weight=0.002)
    add_box("Sign subtitle rule left", (1.35, 0.012, 0.012), (-1.78, -2.232, 2.79), trim, 0.003)
    add_box("Sign subtitle rule right", (1.35, 0.012, 0.012), (1.78, -2.232, 2.79), trim, 0.003)

    # Side blade sign.
    add_box("Blade sign mount top", (0.38, 0.07, 0.07), (-2.76, -2.10, 3.25), trim, 0.025)
    add_box("Blade sign mount low", (0.38, 0.07, 0.07), (-2.76, -2.10, 2.72), trim, 0.025)
    add_box("Blade sign frame", (0.62, 0.14, 1.42), (-3.02, -2.12, 2.98), trim, 0.20)
    add_box("Blade sign panel", (0.47, 0.035, 1.18), (-3.02, -2.21, 2.98), sign_cream, 0.16)
    add_text("Blade top", "設", (-3.02, -2.238, 3.20), 0.29, red, font, weight=0.004)
    add_text("Blade bottom", "計", (-3.02, -2.238, 2.77), 0.29, red, font, weight=0.004)

    # Five restrained red canvas panels.
    for index in range(6):
        x = -2.14 + index * 0.855
        add_box(f"Awning panel {index}", (0.84, 0.86, 0.075),
                (x, -2.42, 2.38), awning, 0.018,
                rotation=(math.radians(8.0), 0, 0))
    add_box("Awning front valance", (5.13, 0.10, 0.17), (0, -2.85, 2.27), awning, 0.03)
    for x in (-2.56, 2.56):
        add_box(f"Awning side skirt {x}", (0.10, 0.76, 0.25), (x, -2.45, 2.30),
                awning, 0.025)

    # Door-hanging open sign.
    open_sign_x = door_shift + 0.62
    add_box("Open sign board", (0.66, 0.035, 0.80), (open_sign_x, -2.075, 1.58), sign_cream, 0.06)
    add_text("Open sign title", "營業中", (open_sign_x, -2.099, 1.79), 0.13, red, font, weight=0.002)
    add_box("Open sign divider", (0.52, 0.012, 0.012), (open_sign_x, -2.099, 1.65), trim, 0.003)
    add_text("Open sign hours", "24H", (open_sign_x, -2.099, 1.47), 0.13, trim_light, font, weight=0.002)
    for x in (open_sign_x - 0.12, open_sign_x + 0.12):
        add_cylinder(f"Open sign hanger {x}", 0.006, 0.20,
                     (x, -2.065, 1.96), trim, vertices=12,
                     rotation=(0, 0, math.radians(18 if x < open_sign_x else -18)))

    # Deep-green T-shaped streetlight with warm amber lanterns.
    add_box("Streetlight foot", (0.58, 0.58, 0.18), (-4.00, -2.72, 0.43), lamp_frame, 0.10)
    add_box("Streetlight plinth", (0.32, 0.32, 0.34), (-4.00, -2.72, 0.63), lamp_frame, 0.055)
    add_cylinder("Streetlight post", 0.075, 2.28, (-4.00, -2.72, 1.93), lamp_frame,
                 vertices=24, bevel=0.018)
    add_box("Streetlight crossbar", (1.12, 0.11, 0.12), (-4.11, -2.72, 3.08), lamp_frame, 0.055)
    for x in (-4.67, -3.55):
        add_box(f"Streetlight housing {x}", (0.24, 0.23, 0.22), (x, -2.72, 2.95),
                lamp_frame, 0.065)
        add_box(f"Streetlight lens {x}", (0.19, 0.20, 0.15), (x, -2.72, 2.86),
                lamp_glow, 0.045)

    # Keep the clean extracted plant, then place the two optimized supplied props.
    place_detail_props()
    place_imported_prop(VENDING_PATH, "vending_source", -1.92, -2.54, 0.34, 1.72)
    place_imported_prop(FREEZER_PATH, "freezer_source", -0.72, -2.56, 0.34, 1.00)

    # A-frame recommendation board moved to the outer edge of the storefront.
    board_x = 2.70
    board_rotation = (math.radians(-9), 0, 0)
    add_box("Board front", (0.92, 0.06, 1.10), (board_x, -2.70, 0.97),
            chalkboard, 0.04, rotation=board_rotation)
    add_box("Board rear", (0.92, 0.06, 1.10), (board_x, -2.54, 0.97),
            chalkboard, 0.04, rotation=(math.radians(9), 0, 0))
    for x in (board_x - 0.35, board_x + 0.35):
        add_box(f"Board leg {x}", (0.06, 0.06, 1.15), (x, -2.62, 0.79),
                trim, 0.018, rotation=(0, math.radians(-8 if x < board_x else 8), 0))
    add_text("Board recommendation", "今日推薦", (board_x, -2.735, 1.24), 0.13, chalk, font)
    add_text("Board item", "好喝", (board_x, -2.735, 0.91), 0.09, chalk, font)
    add_cylinder("Board cup", 0.105, 0.20, (board_x, -2.735, 0.69),
                 awning, vertices=20, rotation=(math.radians(90), 0, 0))

    # Side-wall service hardware.
    add_box("Utility box", (0.12, 0.34, 0.48), (2.72, 0.74, 2.18), trim, 0.04)
    add_box("Utility face", (0.02, 0.24, 0.34), (2.79, 0.74, 2.18), trim_light, 0.025)
    for y in (0.54, 0.73, 0.92):
        add_cylinder(f"Service conduit {y}", 0.018, 1.70, (2.76, y, 1.10),
                     trim, vertices=12, bevel=0.004)
    add_cylinder("Front downpipe", 0.055, 2.64, (2.73, -1.68, 1.91),
                 trim, vertices=18, bevel=0.008)
    add_cylinder("Front pipe shoe", 0.085, 0.35, (2.73, -1.68, 0.57),
                 trim, vertices=18, bevel=0.01)

    # A small warm strip under the awning reproduces the spill without filling the empty interior.
    add_box("Under-awning lamp", (4.90, 0.08, 0.035), (0, -2.43, 2.22), soft_glow, 0.01)
    return {
        "wall": wall,
        "trim": trim,
        "glass": glass,
    }


def setup_stage():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 12 if QUICK else 64
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 5
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 3
    scene.cycles.transmission_bounces = 5
    scene.render.resolution_x = 960 if QUICK else 1536
    scene.render.resolution_y = 760 if QUICK else 1200
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"

    world = scene.world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    # Keep the product-render background and floor neutral white so the
    # architectural palette, rather than the studio fill, carries the color.
    background.inputs["Color"].default_value = (*srgb("#ffffff"), 1)
    background.inputs["Strength"].default_value = 1.15
    scene.view_settings.exposure = -0.24

    ground_mat = make_material("Studio floor", "#ffffff", 0.9)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.03))
    ground = bpy.context.object
    ground.name = "Studio floor"
    ground.data.materials.append(ground_mat)

    for name, location, energy, size in (
        ("Key softbox", (-4.5, -6.0, 7.0), 780, 6.0),
        ("Front fill", (4.0, -5.0, 4.6), 470, 5.0),
        ("Right rim", (5.5, 3.5, 5.8), 520, 4.5),
        ("Top softbox", (0.0, 0.5, 8.5), 560, 5.5),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        direction = (0, 0, 1.9)
        obj.rotation_euler = (
            __import__("mathutils").Vector(direction) - obj.location
        ).to_track_quat("-Z", "Y").to_euler()

    camera_data = bpy.data.cameras.new("Exterior Camera")
    camera = bpy.data.objects.new("Exterior Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 7.3
    scene.camera = camera
    return camera


def render_views(camera):
    from mathutils import Vector
    scene = bpy.context.scene
    views = {
        "front_threequarter": ((4.9, -14.0, 3.30), (-0.42, -0.05, 1.82), 9.4),
        "front_orthographic": ((0, -16, 2.65), (-0.18, 0, 1.86), 9.4),
        "right": ((15, -4.5, 3.25), (0, 0, 1.86), 7.0),
        "back": ((0, 15, 2.70), (0, 0, 1.86), 7.0),
    }
    for name, (location, target, scale) in views.items():
        camera.location = location
        camera.data.ortho_scale = scale
        camera.rotation_euler = (
            Vector(target) - camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        suffix = "quick" if QUICK else "final"
        scene.render.filepath = os.path.join(RENDER_DIR, f"store-exterior-{name}-{suffix}.png")
        bpy.ops.render.render(write_still=True)


def save_and_export():
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    bpy.ops.object.select_all(action="DESELECT")
    exportable = [obj for obj in bpy.context.scene.objects
                  if obj.get("exportable") and obj.type in {"MESH", "FONT"}]
    for obj in exportable:
        obj.select_set(True)
    if exportable:
        bpy.context.view_layer.objects.active = exportable[0]
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_normals=True,
        export_texcoords=True,
        export_materials="EXPORT",
        export_image_format="WEBP",
        export_image_quality=WEBP_QUALITY,
        export_unused_images=False,
        export_cameras=False,
        export_lights=False,
    )
    print("STORE_RENDER_DIR", RENDER_DIR)
    print("STORE_BLEND", BLEND_PATH)
    print("STORE_GLB", GLB_PATH)


def main():
    make_scene()
    if not NO_PREVIEW:
        camera = setup_stage()
        render_views(camera)
    save_and_export()


if __name__ == "__main__":
    main()
