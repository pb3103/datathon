import Foundation
import PDFKit
let ranges = ["2017":92...101,"2018":95...104,"2019":119...135,"2020":104...113]
for path in CommandLine.arguments.dropFirst() {
 let year=URL(fileURLWithPath:path).deletingLastPathComponent().lastPathComponent
 guard let doc=PDFDocument(url:URL(fileURLWithPath:path)),let pages=ranges[year] else {continue}
 var output:[[String:Any]]=[]
 for pageNum in pages {
  guard let page=doc.page(at:pageNum-1),let value=page.string else {continue}
  let ns=value as NSString;let regex=try! NSRegularExpression(pattern:"\\S+")
  var words:[[String:Any]]=[]
  for match in regex.matches(in:value,range:NSRange(location:0,length:ns.length)) {
   guard let sel=page.selection(for:match.range) else {continue}
   let b=sel.bounds(for:page)
   words.append(["text":ns.substring(with:match.range),"x":b.midX,"y":b.midY,"x0":b.minX,"x1":b.maxX,"y0":b.minY,"y1":b.maxY])
  }
  output.append(["page":pageNum,"words":words])
 }
 let data=try! JSONSerialization.data(withJSONObject:output,options:[.sortedKeys])
 try! data.write(to:URL(fileURLWithPath:"/tmp/wastewise-audit/historical-words-\(year).json"))
 print("\(year): \(output.count) historical pages")
}
