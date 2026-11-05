# Skill & VFX Studio

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
