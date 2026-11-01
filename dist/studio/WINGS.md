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
   tải PNG/WebP/JPG. Bật **Tự tách các mảnh rời** để phân tích ảnh nhiều mảnh;
   dùng **Tách ảnh đang gán** nếu đã lỡ gán nguyên tấm. Tách nền từ mép ảnh,
   giữ chi tiết trắng bên trong, có lọc bụi/gộp vùng như editor nhân vật.
   Không tự chia một hình cánh đang dính liền thành lông vũ hoặc mesh.
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

## Ảnh gồm nhiều bộ phận hoặc nhiều tư thế

- **Nhiều đoạn cánh riêng để rig:** trong hộp tách, chọn mảnh, đặt tên rồi gán
  vào xương có sẵn hoặc **＋ Xương cánh gần/xa mới**. Dùng **Gán hàng loạt**
  để chọn một vai trò cho nhiều ảnh; có thể đổi từng hàng. Chọn bỏ hiển thị
  ảnh nguyên tấm nếu nó đang nằm trên xương gốc. Nút **Lưu & gán** tạo/gán
  một lần; **Lưu các mảnh** chỉ đưa vào thư viện, không đổi rig hay animation.
- **Bốn hình là bốn tư thế của cùng cánh, như ảnh tham chiếu:** chọn các hình
  rồi bấm **Ảnh đã chọn → các frame cùng một cánh**, chỉnh bước frame,
  bấm **Lưu & gán**. Tạo clip lặp với mỗi hình ở một frame giữ ảnh; không vẽ
  cả bốn cánh cùng lúc. Clip cũ vẫn giữ trong bộ animation.
- **Tài nguyên cánh đã cắt:** giữ tên và xương đã chọn, hỗ trợ chọn nhiều mảnh
  để gán lại. Lưu ảnh trong `sprites`, không nhân đôi một bản `resources` nữa.
- Chọn **Ngọn cánh trong ảnh gốc hướng trái/phải** khi nhập, không phải hướng
  quay của nhân vật. Ảnh tham chiếu có ngọn sang trái, gốc gắn lưng ở bên phải.
  Neo `.94/.75` (hoặc `.06/.75` cho ảnh ngọn phải) chỉ là gợi ý ban đầu;
  kiểm tra và chỉnh trên ảnh cho đúng thiết kế của bạn.

## Góc nhìn 3/4 thay vì xòe ngang chính diện

Project cánh mới và project cũ mở trong editor mặc định dùng **3/4 · cánh
quét về sau lưng**. Khung/keyframe gốc được giữ nguyên; không tự xoay lại
góc của tất cả frame. Có thể chọn **Chính diện** để quay về khung ảnh gốc.

Trong **Góc cánh theo nhân vật**, chỉnh góc xoay, cỡ cánh xa và độ quét lên.
Tỷ lệ mặc định mới là **0.96**: cánh xa nhỏ hơn cánh gần 4% trên cùng mặt
phẳng chiếu. Không nhân thêm cos(góc) cho cánh xa nữa. Thiết lập mặc định cũ
`55° / 0.72 / 0.15` được sửa một lần khi mở; tỷ lệ bạn chỉnh riêng vẫn được
giữ. `wingView.version: 2` giữ nguyên các lựa chọn mới qua lưu/mở lại.

Nếu ảnh cánh xa trong sheet vốn nhỏ hơn ảnh cánh gần, dùng **Cân gần–xa ·
xa nhỏ hơn 4%** ở chế độ Dựng rig. Với rig rời cần đúng một gốc Cánh gần và
một gốc Cánh xa (các đoạn khác là xương con). Công cụ cân độ vươn trong tư
thế gốc bằng tỷ lệ xương gốc cánh xa; không đổi ảnh, điểm gắn hay các keyframe.
Có thể Hoàn tác. Nên so hai cánh ở cùng tư thế mở/gập; không dùng phép cân
để ép một ảnh cánh gập thành hình cánh đang mở.

Nhân vật nền trong editor cánh luôn đứng **idle trung tính**, tay thả xuống,
chân đứng vững, không lấy frame đầu của clip đang mở ở Studio nhân vật.
Đây chỉ là preview để căn cánh; không sửa animation nhân vật hoặc cánh.

Đặt **Vai trò xương cánh** ở đầu mỗi nhánh: gần, xa, gốc giữa hoặc ảnh nguyên
đôi cánh chính diện. Xương con để **Theo xương cha** để không chiếu phối cảnh
hai lần. Cánh xa được vẽ trước cánh gần, cả hai vẫn sau nhân vật và lật theo
hướng nhân vật. Với ảnh nguyên đôi, bộ phát chiếu riêng hai nửa quanh neo,
không giữ một tấm đối xứng hướng thẳng vào người xem.

Đây là phép chiếu cutout 2D, không dựng thêm mặt khuất hay tái vẽ vật thể 3D.
Ảnh cánh được vẽ sẵn theo góc 3/4 vẫn cho kết quả tự nhiên nhất. Thông số
`wingView`, `wingSide`, `wingSource` đi cùng project, bundle, web preview và
bộ phát demo; game khác cần dùng bộ phát mới để đọc đúng phối cảnh.

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
