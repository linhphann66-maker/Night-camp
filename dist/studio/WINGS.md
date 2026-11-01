# Cánh & rig cutout

Mở Studio → ☰ → **Cánh & rig** (desktop có nút ở thanh trên).
Video tham chiếu cho thấy cánh nằm sau lưng, có khớp riêng và chuyển động
vỗ/mở–gập. Công cụ này dựng chuyển động cutout; không sao chép mesh hay hiệu
ứng lửa của video. Không sửa asset gốc hoặc tự ghi vào GitHub khi chỉnh.

## Tạo cánh của bạn

1. Chọn **Tạo cánh trống**: chỉ có một xương gốc, một frame trung tính,
   không mang ảnh hoặc animation mẫu. Hoặc chọn **Khung cánh hai bên**
   trong mục Chọn cánh & chuyển động: gồm gốc chung, hai gốc cánh và hai
   ngọn cánh. Khung này có mẫu góc vỗ, chưa có ảnh.
2. Chuyển **Chế độ → Dựng rig**. Vào **Khớp & ảnh bộ phận**, chọn xương,
   tải PNG/WebP riêng hoặc chọn ảnh đã có trong project. Ảnh phải tách sẵn
   từng mảnh để mỗi mảnh xoay độc lập; một ảnh nguyên đôi cánh không tự
   biến thành nhiều mảnh hoặc mesh.
3. Đặt điểm xoay trên ảnh, nối cha–con, thêm/xóa/đổi tên xương và chỉnh lớp.
   Công cụ **Đặt khớp trên ảnh · giữ ảnh** giữ nguyên vị trí hình khi đặt neo.
   Gốc chung ở (0,0) là điểm gắn lên lưng; đặt các nhánh tương đối với gốc này.
4. Chuyển **Animation** để khóa khung gốc. Tạo animation mới (một frame),
   xoay xương bằng số hoặc kéo đầu xương; **Ghi pose** trước khi gắn/lưu.
   **Thêm frame kế tiếp** kế thừa tư thế hiện tại. Có sao chép pose nhiều frame,
   đường cong, biến thể ảnh và nhiều clip. Chọn clip muốn phát trước khi gắn.
5. **Gắn vào nhân vật** → **← Nhân vật** → Phát để thử. Cánh vẽ sau toàn bộ
   nhân vật, đi theo thân, nghiêng, xoay và lật cùng nhân vật; clip cánh có đồng
   hồ riêng, không bị reset khi nhân vật đổi từ đứng sang đi/chạy/đánh.

Để chỉnh độ lớn/vị trí toàn bộ cánh, về **Phụ kiện & vũ khí**, chọn món cánh,
chỉnh **Lệch X/Y**, **Tỷ lệ**, **Góc**. Không dùng Rộng/Cao hay điểm neo của
một ảnh để chỉnh cả rig. Nút **Thiết kế xương & animation cánh** mở lại đúng rig
đang đeo; bấm gắn lần nữa cập nhật món đó, không tạo thêm bản trùng.
Preview trong editor dùng đúng điểm gắn và độ lệch của món đang đeo.

## Mẫu Falcon có sẵn

Mẫu dùng ba sprite `rig_wfalcon_cape`, `rig_wfalcon_wings1`,
`rig_wfalcon_wings2`, giữ điểm `joints.top` theo từng ảnh. Ba clip: gập–mở–gập,
mở dao động, gập. Đây là đổi ảnh nguyên đôi cánh, không phải rig lông vũ
nhiều xương đã được khôi phục từ game gốc. Muốn xoay riêng từng đoạn, hãy
dựng khung hai bên và gán ảnh từng đoạn riêng.

## Các cách lưu

- **Lưu cánh**: `.wing-cutout.json`, gồm rig, ảnh nhúng và tất cả clip; mở lại
  trong editor cánh. Lưu nháp cánh dùng khóa riêng, không ghi đè nháp pet.
- **Xuất game bundle** trong editor cánh: `nightcamp-wing-cutout-export-v1`,
  gồm project và mã bộ phát cutout độc lập. Chỉ cánh, không có nhân vật nền.
  Bộ phát dùng API `PetCutoutPlayer` chung: cập nhật rồi vẽ ở điểm gắn lưng
  của game mới, trước khi vẽ thân nhân vật. Không cần server game/GitHub.
- **Lưu project / Xuất cho game** ở Studio nhân vật sau khi gắn: mang cả sáu
  bộ phận, phụ kiện, rig cánh và tất cả ảnh/clip cánh. Dùng file này để import
  vào Cutout Playground đã cập nhật bộ phát. Bundle cánh riêng không thay
  thế được project nhân vật sáu bộ phận.
- **Xuất web preview độc lập**: xem riêng cánh/rig đã xuất, không có nhân vật
  preview của Studio. Không cần mạng khi đã nhúng đủ ảnh.

## Tích hợp runtime

Phụ kiện cánh nằm trong `project.attachments[]`, có `socket: 'back'`,
`layer: 'back'`, `wingRig` là project rigid-cutout dùng chung định dạng pet.
Khung cha–con và animation không nhập vào sáu xương nhân vật.
`loadAttachmentSprites` tải đủ ảnh lồng bên trong; `gameExport` tạo manifest
và tên sprite cho cả cánh. Renderer được tạo bằng
`node tools/build-cutout-runtime.mjs`; không sửa riêng bản avatar generated.
`P.attachmentTime` là thời gian clip cánh, độc lập với clip nhân vật.
Khả năng hiện tại: cutout cứng, tối đa 100 xương / 300 ảnh / 100 clip mỗi rig.
Chưa có mesh, trọng số, IK cánh chuyên dụng, va chạm hoặc cơ chế bay server.
