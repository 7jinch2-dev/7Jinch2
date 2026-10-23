// 用 macOS Vision 框架做主体提取（前景蒙版），输出透明底 PNG
// 用法: cutout <输入图> <输出png>
import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("用法: cutout <in> <out>\n".data(using: .utf8)!)
    exit(1)
}
let srcURL = URL(fileURLWithPath: args[1])
let dstURL = URL(fileURLWithPath: args[2])

guard let ciImage = CIImage(contentsOf: srcURL) else {
    FileHandle.standardError.write("读不到输入图\n".data(using: .utf8)!)
    exit(2)
}

let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
let context = CIContext()
var output: CIImage? = nil

// 方案一：主体提取（新版接口，抠得最干净）
do {
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])
    if let result = request.results?.first {
        let masked = try result.generateMaskedImage(
            ofInstances: result.allInstances,
            from: handler,
            croppedToInstancesExtent: false   // 保留原图尺寸与位置
        )
        output = CIImage(cvPixelBuffer: masked)
        print("用主体提取，识别到 \(result.allInstances.count) 个主体")
    }
} catch {
    FileHandle.standardError.write("主体提取不可用，转用人物分割: \(error.localizedDescription)\n".data(using: .utf8)!)
}

// 方案二：人物分割（老接口，兼容性好）
if output == nil {
    do {
        let request = VNGeneratePersonSegmentationRequest()
    if #available(macOS 14.0, *) { } else { request.usesCPUOnly = true }
        request.qualityLevel = .accurate
        request.outputPixelFormat = kCVPixelFormatType_OneComponent8
        try handler.perform([request])
        guard let obs = request.results?.first else {
            FileHandle.standardError.write("没有识别到人物\n".data(using: .utf8)!)
            exit(4)
        }
        let mask = CIImage(cvPixelBuffer: obs.pixelBuffer)
        let sx = ciImage.extent.width / mask.extent.width
        let sy = ciImage.extent.height / mask.extent.height
        let scaledMask = mask.transformed(by: CGAffineTransform(scaleX: sx, y: sy))

        let clear = CIImage(color: .clear).cropped(to: ciImage.extent)
        let blend = CIFilter(name: "CIBlendWithMask")!
        blend.setValue(ciImage, forKey: kCIInputImageKey)
        blend.setValue(clear, forKey: kCIInputBackgroundImageKey)
        blend.setValue(scaledMask, forKey: kCIInputMaskImageKey)
        output = blend.outputImage
        print("用人物分割（质量 \(request.qualityLevel.rawValue)）")
    } catch {
        FileHandle.standardError.write("人物分割也失败: \(error)\n".data(using: .utf8)!)
        exit(5)
    }
}

guard let out = output, let cg = context.createCGImage(out, from: out.extent) else {
    FileHandle.standardError.write("生成 CGImage 失败\n".data(using: .utf8)!)
    exit(6)
}
let rep = NSBitmapImageRep(cgImage: cg)
guard let data = rep.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write("编码 PNG 失败\n".data(using: .utf8)!)
    exit(7)
}
try data.write(to: dstURL)
print("完成: \(dstURL.path)  \(cg.width)x\(cg.height)")
