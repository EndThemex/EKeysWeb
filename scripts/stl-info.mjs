// 解析 binary STL, 输出顶点数 / 包围盒 / 是否已居中
import { readFileSync } from "node:fs";
const path = process.argv[2];
const buf = readFileSync(path);
if (buf.length < 84) {
  console.error("too small");
  process.exit(1);
}
const triCount = buf.readUInt32LE(80);
console.log("tris:", triCount);
const minX = [Infinity, Infinity, Infinity];
const maxX = [-Infinity, -Infinity, -Infinity];
let off = 84;
for (let i = 0; i < triCount; i++) {
  off += 12; // normal
  for (let v = 0; v < 3; v++) {
    const x = buf.readFloatLE(off);
    const y = buf.readFloatLE(off + 4);
    const z = buf.readFloatLE(off + 8);
    off += 12;
    if (x < minX[0]) minX[0] = x;
    if (y < minX[1]) minX[1] = y;
    if (z < minX[2]) minX[2] = z;
    if (x > maxX[0]) maxX[0] = x;
    if (y > maxX[1]) maxX[1] = y;
    if (z > maxX[2]) maxX[2] = z;
  }
  off += 2; // attr
}
console.log("min:", minX);
console.log("max:", maxX);
console.log("size:", [maxX[0] - minX[0], maxX[1] - minX[1], maxX[2] - minX[2]]);
console.log("center:", [
  (minX[0] + maxX[0]) / 2,
  (minX[1] + maxX[1]) / 2,
  (minX[2] + maxX[2]) / 2,
]);
