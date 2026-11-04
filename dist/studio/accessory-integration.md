# Phụ kiện & cánh theo đầu/thân

## Trong Studio

1. Nhân vật & ảnh bộ phận → Mã đầu & thân cho game. Đầu Traveler gốc (như demo) có `headId: nightcamp-head-original-v1`; nút **Dùng đầu Traveler gốc như demo** chọn đúng cả ảnh, kích thước và mã, không chỉ đổi nhãn. Các đầu có hình học khác có mã riêng. Mỗi thân có `bodyId` riêng.
2. Phụ kiện & vũ khí → chọn món, căn kích thước/neo/vị trí. **Lưu cấu hình cho đầu / thân hiện tại**. Có thể đặt mã phụ kiện ổn định (`accessoryId`) như `mu_sat_v1`.
3. Đổi đầu/thân: cấu hình khớp mã + dấu hình học được áp dụng; chưa có cấu hình sẽ ẩn, không xóa món hay các cấu hình cũ. Để căn mới: chọn món, bật Hiện phụ kiện, chỉnh rồi lưu. Đổi lại đầu cũ, chọn món để dùng lại cấu hình cũ. Cánh dùng `bodyId`, không dùng `headId`.
4. **Xuất riêng món đang chọn** hoặc tích nhiều món rồi **Xuất gói các món đã tích**. Chỉ những món ấy được xuất, kể cả món đang ẩn đã có cấu hình. Gói có đầy đủ ảnh nhúng, các cấu hình và rig/animation cánh; không chứa đầu, thân hay animation nhân vật.
5. **Nhập gói phụ kiện / cánh** để sửa tiếp. Món có cùng accessoryId được cập nhật và hợp nhất các cấu hình, không nhân đôi. Hãy đổi accessoryId nếu muốn tạo một món mới độc lập.

Với cánh, cấu hình theo thân lưu **Lệch X/Y, Tỷ lệ, Góc** ở mục Phụ kiện & vũ khí. Xương, ảnh, hướng 3/4 và keyframe trong cửa sổ Cánh & rig là thiết kế chung của món cánh; sửa chúng sẽ thay thiết kế ở mọi cấu hình. Muốn hai thiết kế cánh khác nhau, tạo hai accessoryId, không dùng cấu hình thân làm bản sao rig.

Lưu project và Xuất game bundle cũ vẫn chứa toàn bộ nhân vật và phụ kiện. Không đổi hai format `nightcamp-cutout-v1` / `nightcamp-cutout-export-v1`. Gói phụ kiện mới dùng `darkin-accessory-pack-v1`; đây là hằng định dạng dữ liệu, không phải tên game.

Thay hình ảnh, kích thước, khớp của đầu/thân sẽ tạo mã tự động khác để tránh dùng nhầm. Có thể đặt mã riêng có phiên bản như `dau_tien_v2`. Không đổi mã tùy tiện giữa các lần xuất; game và gói phải dùng cùng mã. Dấu hình học kiểm tra kích thước/khớp, không phải nhận diện nội dung ảnh bằng AI.

## Đưa qua game mới

Chuẩn bị một lần: nhân vật đầy đủ, bộ phát CutoutPlayer, các clip idle/walk/run/attack (hoặc tên clip tự thiết kế). Giữ nguyên `parts`, `headId`, `bodyId`, `mountSignatures` từ `bundle.project` khi đổi bundle sang định dạng nhân vật của game. File demo cũ không có các trường này: xuất lại project từ Studio, dùng nút đầu Traveler gốc nếu cần. Không tự suy ra headId từ tên trang phục.

Sau đó chỉ thêm `*.accessory-pack.json` và tải `accessory-runtime.mjs` bằng nút trong Studio. Module ghép này độc lập, không thay thế bộ phát animation. Gợi ý thư mục:

```
public/assets/characters/hero.game-bundle.json
public/assets/accessories/mu-kinh.accessory-pack.json
public/assets/accessories/canh.accessory-pack.json
src/runtime/accessory-runtime.mjs
```

Ví dụ chọn phụ kiện (không dùng eval, không nhân đôi nhân vật):

```js
import {validateAccessoryPack, equipAccessory} from './runtime/accessory-runtime.mjs';

const response = await fetch('/assets/accessories/mu-kinh.accessory-pack.json');
if (!response.ok) throw new Error('Không tải được gói phụ kiện');
const pack = validateAccessoryPack(await response.json());
const item = pack.items.find(a => a.accessoryId === 'mu_sat_v1');
if (!item) throw new Error('Không tìm thấy phụ kiện');

// character giữ nguyên headId, bodyId, parts từ bundle.project đã xuất.
// Món cùng loại tự ẩn nhưng vẫn còn trong danh sách.
try {
  character.attachments = equipAccessory(character.attachments || [], item, character);
} catch (error) {
  // Thiếu đúng cấu hình: báo người dùng, KHÔNG tự dùng cấu hình của đầu khác.
  console.warn(error.message);
}
```

Cánh dùng cùng API: item chứa `wingRig` cùng mọi ảnh/clip. Khi đổi đầu/thân phải chạy lại `resolveAccessory(item, character)` cho từng món được mặc; nếu không khớp, ẩn món và yêu cầu cấu hình mới. Không nhân thêm hệ số tự căn kích thước lên các thông số đã xuất.

### Áp dụng vào bộ phát

`equipAccessory` trả về dữ liệu, không tự cập nhật texture đang nằm trong bộ phát. Với CutoutPlayer hiện tại, cách tích hợp đơn giản, an toàn là dựng bản thay thế rồi mới bỏ bản cũ:

```js
const nextSpec = structuredClone(player.spec); // giữ format, weapon, toàn bộ clips
Object.assign(nextSpec, {
  parts: character.parts,
  headId: character.headId,
  bodyId: character.bodyId,
  mountSignatures: character.mountSignatures,
  attachments: character.attachments,
});
const next = await CutoutPlayer.load(nextSpec, assetBaseURL);
next.face = player.face;
next.play(player.name); // giữ hành động, thời gian bắt đầu lại
const old = player;
player = next;
old.dispose();
```

Chỉ thay bộ phát sau khi load thành công. Nếu game có API cập nhật trang bị riêng, nạp ảnh/ảnh cánh trước, cập nhật danh sách attachments của renderer và xóa texture cũ đúng vòng đời; không chỉ sửa biến character rồi mong renderer tự đổi. Cần tải toàn bộ thư mục runtime của CutoutPlayer, không chỉ player.mjs. Game mới ngoài dự án này chưa tự được tích hợp API trên.

Multiplayer: máy chủ kiểm tra quyền sở hữu món và slot; đồng bộ accessoryId + headId/bodyId (và phiên bản dữ liệu), không tin thông số sức mạnh hay data URL do client gửi. Client dùng cùng các gói phát hành để resolve thông số vẽ.
