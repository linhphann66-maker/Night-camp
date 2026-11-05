# Skill & VFX Studio

## Bản sửa trình biên tập · skill-runtime v2

- **Bắt đầu 0,5 + Dài 0,8** được lưu thành mốc 0,50–1,30 giây. Nếu skill
  mới dài 1 giây, Studio tự kéo dài thành 1,30 giây, không từ chối rồi để ô
  nhập hiển thị giá trị chưa lưu. Chấp nhận dấu phẩy hoặc dấu chấm. Mốc vượt
  giới hạn 30 giây vẫn bị từ chối, ô nhập được hoàn về dữ liệu hợp lệ và báo rõ.
- Rời ô/chuyển mục/xuất file sẽ chốt dữ liệu đang nhập. Chuyển panel giữ mốc,
  playhead và giá trị đã lưu; đổi sang skill khác mới chọn lại mốc đầu của skill.
  Nút **Về 0 s** là thao tác tua về đầu có chủ đích.
- Preview có nhãn tách biệt **Timeline**, **Xem mẫu thư viện**, **Dùng thử**.
  Về timeline hoặc đổi mốc sẽ thoát mẫu/thử. VFX của timeline chỉ xuất hiện
  trong khoảng `at <= t < at + duration`; không vẽ mẫu hoặc bóng/glow trước mốc.
- Công cụ mặc định **Chọn / kéo riêng VFX** sửa offset của đúng mốc được chọn,
  có khung và tâm. Không di chuyển mục tiêu cam chung. Đổi công cụ sang **Đổi
  mục tiêu chung** mới làm các VFX cùng neo mục tiêu dịch theo nhau có chủ đích.
  Khi chồng nhau, ưu tiên mốc đang chọn; dùng danh sách hoặc Chỉ xem mốc chọn
  để chọn chính xác. Ẩn mốc, Khóa kéo, tên riêng, phím/nút mũi tên giúp chỉnh nhỏ.
- **Đến mốc chọn** đưa playhead vào giữa mốc để kéo được VFX. Nếu đang ngoài
  thời gian xuất hiện, không tự vẽ một bản ma để kéo gây hiểu nhầm là đã chạy sớm.
- Màu mẫu dựng chỉnh riêng từng mốc, không đổi tài nguyên chung và mốc khác.
  Undo/Redo một lần cho một lần kéo; hủy chạm trả lại trạng thái trước khi kéo.

Có 15 chuyển động: tại chỗ, nở, thu, phồng/co, xoay, lượn quanh neo, xoắn ốc,
bay lên, rơi xuống, lắc ngang, rung nhẹ, trượt X/Y, bay đến mục tiêu, bay cung,
bay đi–về. Ô biên độ/nhịp/vòng/đích chỉ bật khi có tác dụng với chuyển động đó.
Có nhịp đều/nhanh dần/chậm dần/êm đầu cuối và thời gian hiện/tan theo từng mốc.

Project v1 cũ vẫn mở nguyên dạng, không đổi ID/ảnh hay tự sắp xếp lại mốc.
Các trường mới là tùy chọn; gói xuất mới dùng **skill-runtime.mjs v2**. Map
bundle có `skillRuntime.version: 2`, bộ phát map vẫn v7. Cập nhật bộ phát skill
ở game để dùng chuyển động mới. Giá trị từng bị từ chối trong bản cũ chưa được
lưu: người dùng cần nhập lại lần đó; Studio không tự đoán mốc đã mất.

Mở **☰ → Skill & VFX · hiệu ứng** trong Cutout Studio, hoặc mở mục Skill & VFX
trong Map Studio. Đây là project riêng: không ghi đè nhân vật, phụ kiện hay map.

## Thiết kế

1. Tạo kỹ năng riêng, hoặc chọn trong **Thư viện skill gốc**, chọn cấp và tạo
   thiết kế. Có 433 bản ghi kỹ năng từ source lưu trữ Night Camp; giữ ID, nghề,
   loại, thông số từng cấp, dữ liệu gốc và tên gốc. Các tên quen thuộc có nhãn
   Việt; mẫu chưa có bản dịch dùng ID, không đoán nội dung tiếng Thái.
2. Mở **Thư viện VFX** để chọn trong 228 mẫu: 188 ảnh gốc, 36 chuỗi frame và
   4 mẫu dựng Studio. Chọn rồi thêm vào timeline. Có thể tải ảnh riêng PNG/WebP/JPG.
   Chuỗi frame giữ kích thước, điểm gốc và thời gian từ maplefx/obtboom manifest.
   Ảnh đơn chỉ là ảnh gốc: không tự bao gồm shader/mesh, ánh sáng động hay âm thanh.
   Một số ảnh lưu trữ chưa phát hành trong game được cho phép duyệt để thiết kế;
   thư viện không tuyên bố tất cả đều là skill đang hoạt động trong game gốc.
3. Chỉnh mốc bắt đầu, độ dài, tỷ lệ, độ rõ, độ lệch, góc, neo vào người/mục tiêu/
   tọa độ map, bám người phát, chuyển động tại chỗ/nở/bay và lớp low/high/glow.
   Lớp glow vẽ sau ánh sáng, high nhận ánh sáng map; cộng sáng hợp ảnh nền đen.
   Màu chỉ dùng cho 4 mẫu dựng, không sửa ảnh gốc. Màu mẫu ban đầu lấy palette vfx.js.
4. Phát/tạm dừng, kéo thời gian, lặp, đổi ngày/đêm, zoom và chạm preview để đổi
   mục tiêu. Chấm xanh là người phát, chấm cam là mục tiêu, không phải rig người.
   **Dùng thử** kiểm tra cooldown hình ảnh; skill passive không được cast.

Kỹ năng gốc chỉ cung cấp metadata; Studio không tự chuyển toàn bộ `SKILL_RUN`
thành timeline. Bạn cần tự ghép VFX cho skill; không chọn tự động ảnh gần giống
rồi tuyên bố đó là hoạt ảnh gốc. SP, hệ số, hồi chiêu và mô tả từng cấp được
chụp từ hàm dữ liệu nguồn; không serialize/chạy các hàm chiến đấu vào file game.

`animation` là tên clip nhân vật mà game phải ánh xạ (vd attack hoặc bow_shoot).
`hitAt` là thời điểm gửi tín hiệu hình ảnh; không tự tạo hitbox hoặc gây sát thương.
Mốc VFX phải nằm hết trong thời lượng skill, có kiểm tra thay đổi và Hoàn tác/Làm lại.

## Xuất và tích hợp

- **Lưu project kèm ảnh**: `darkin-skill-project-v1`, để mở/chỉnh lại.
- **Xuất skill-pack + bộ phát**: `darkin-skill-pack-v1`, có `project` và
  `runtime.source` là mã skill-runtime.mjs độc lập, không import Night Camp.
- Chỉ kỹ năng đã thêm và hiệu ứng đang dùng được đóng gói; ảnh nhúng data URL.
  Không đổi ID/format chỉ vì đổi tên file. Nháp trình duyệt đầy thì lưu ra file.
- Map Studio → **Skill & VFX** → Nhập gói. Dùng thử skill trên map hoặc Chạy
  thử rồi phát từ người di chuyển. Map lưu `project.skillPack`, export có
  `skillRuntime.source` bên cạnh map `runtime.source`. Map-runtime v7 hỗ trợ
  ba hook lớp. HTML chạy thử độc lập đã gộp hai bộ phát và ảnh, không cần GitHub.

```js
import {SkillPlayer, loadSkillImages, validateSkillProject} from './skill-runtime.mjs';
const data = validateSkillProject(skillBundle); // hoặc mapBundle.project.skillPack
const images = await loadSkillImages(data);
const fx = new SkillPlayer(data, {onEvent(event) {
  if (event.type === 'cast') character.play(event.animation); // adapter game
  // hit-marker chỉ đồng bộ hình ảnh, không phải chứng cứ hit từ server
}});
fx.cast('fireball', {caster: character.position, target: selectedTarget.position});
// update mỗi tick
fx.update(dt);
map.draw(ctx, width, height, {
  beforeEntities: c => fx.draw(c, images, {layer: 'low'}),
  afterEntities: c => fx.draw(c, images, {layer: 'high'}),
  afterLighting: c => fx.draw(c, images, {layer: 'glow'})
});
```

Game tích hợp phải dùng trusted runtime đã review, không `eval` mã từ file JSON
do người chơi tải lên. `runtime.source` là artifact bàn giao cho lập trình viên.

## Prompt đưa Codex game mới

```text
Tích hợp skill-pack mới hoặc project.skillPack từ map bundle. Giữ nguyên map,
ID nhân vật, trang bị, inventory và multiplayer hiện có. Tạo registry skill
theo skills[id], VFX theo effects[id]; kiểm tra xung đột ID, không ghi đè template
riêng âm thầm. Nạp ảnh nhúng, giữ w/h/ax/ay và thời gian frame, áp timeline với
at/duration/anchor/follow/scale/rotation/opacity/blend/motion và low/high/glow.
Dùng skill-runtime.mjs SkillPlayer, loadSkillImages, update và draw từng lớp;
map-runtime.mjs v7 có beforeEntities/afterEntities/afterLighting. Cast event gọi
clip tên animation của CutoutPlayer qua adapter; báo lỗi clip không có, không
đổi toàn bộ rig. Có cleanup khi đổi map, không tick hai lần hay nhân đôi VFX.
Hit-marker chỉ tín hiệu visual. Server MMO phải xác thực learned skill, rank,
mana, cooldown, trạng thái cast, range, hitbox và mục tiêu; server quyết định
sát thương/status/XP/loot. Không dùng kết quả cooldown/chi phí của client để
phát thưởng. Offline dùng local adapter cùng schema. SP/range/native multiplier
là metadata tham khảo, không tự hoàn thành logic chiến đấu gốc. Passive không
đặt vào nút cast; buff cần handler game thật. Thiếu handler thì báo chưa hỗ trợ.
Test hai người cùng cast, thay skill cùng ID, thay map, thiếu clip/VFX, hồi chiêu,
ngày đêm, file offline và save cũ. Publish Sites để tôi thử, giữ audience cũ.
```
