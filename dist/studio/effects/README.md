# Skill & VFX Studio

## Điểm ngắm mục tiêu và nhiều lần trúng · skill-runtime v3

Trong **Mốc hiệu ứng / timeline**, chọn VFX, chọn frame rồi bấm **Chạm lên
VFX để đặt điểm ngắm**. Chạm tâm vòng phép hoặc đầu trượng/kiếm cần tiếp đất.
Studio lưu điểm trong hệ tọa độ cục bộ VFX (tỷ lệ 1, gốc theo anchor ảnh),
không lưu tọa độ màn hình. Phép ngắm vẫn đúng khi zoom, xoay hay đổi tỷ lệ.
Khi đặt điểm bằng chạm, neo đổi sang mục tiêu, lệch X/Y được đưa về 0.
Game truyền **tọa độ chân** mục tiêu để tâm vòng phép nằm dưới chân, không
truyền góc trên trái sprite. Ô X/Y có thể nhập số âm, dấu phẩy hoặc dấu chấm.

- **Một điểm cố định**: giữ điểm đó và chuyển động dịch chuyển gốc. Với
  chuyển động tại chỗ và lệch X/Y = 0, điểm đó luôn khớp mục tiêu.
- **Theo điểm của từng lần trúng**: dùng điểm của các hit đã gắn VFX và bật
  Bám điểm trúng làm các khóa nội suy. VFX dịch mượt giữa các điểm để mỗi
  điểm tiếp xúc khớp mục tiêu vào đúng mốc. Chế độ này **thay chuyển động
  dịch chuyển** (đường bay/rơi/rung), nhưng giữ chuỗi frame, tỷ lệ và góc.
  Không tự vẽ lại frame hay tách nhiều thanh kiếm thành đối tượng riêng.
- **Chốt vị trí** dùng vị trí lúc cast. **Bám vị trí** dùng object tọa độ
  `targetRef` mà game cập nhật theo quái/người chơi đang được khóa. Studio
  không tự tìm entity theo ID hay quyết định ai là địch. Game phải truyền
  đúng `targetId` và vị trí hợp lệ, xử lý mất mục tiêu/chết/đổi map ở adapter.

Bấm **Các lần trúng / thêm sát thương** hoặc chọn panel **Ngắm mục tiêu &
các lần trúng**. Mặc định có một mốc tương thích `hitAt` cũ. Chỉnh mốc này
hoặc bấm **Thêm lần trúng** sẽ tạo `skills[id].hits[]`; từ đó danh sách thay
thế hoàn toàn `hitAt`, không phát thêm sát thương đơn cũ. Xóa hết là không
có hit. Tối đa 128 mốc/skill; mỗi mốc có ID riêng, giữ qua lưu/mở lại/xuất.

Ví dụ bốn kiếm rơi: gắn cùng VFX, tạo bốn mốc, chọn frame từng kiếm chạm đất,
chạm điểm tiếp xúc riêng, đặt sát thương và phạm vi riêng. Chọn **Theo điểm
của từng lần trúng** nếu muốn lần lượt đưa mỗi điểm đó trùng chân mục tiêu.
Hai hit cùng lúc không thể ngắm hai điểm khác nhau của cùng một VFX: tắt
`alignTarget` ở một mốc hoặc tách thành hai VFX. Nếu muốn nhiều điểm rơi
quanh mục tiêu giữ nguyên bố cục, dùng điểm ngắm cố định và phạm vi vùng.

- Thời điểm theo **giây** là trên toàn timeline skill; tự tăng độ dài skill
  để chứa mốc (giới hạn 30 giây).
- Thời điểm theo **frame** là frame của **ảnh VFX**, không phải frame clip
  nhân vật. UI đếm từ 1, JSON `frame` đếm từ 0. Thời điểm thực là
  `event.at + tổng thời gian frame trước / tổng thời gian VFX * event.duration`.
  Vì vậy đổi tốc độ VFX vẫn giữ đúng frame tiếp xúc. Với tiếp xúc theo clip
  nhân vật, đồng bộ alias `animation` ở game rồi đặt giây trên timeline.
- Điểm trúng của mốc có VFX là tọa độ cục bộ của VFX; không gắn VFX thì là
  độ lệch từ mục tiêu. Bán kính vùng là **đơn vị map**, không nhân tỷ lệ ảnh.
- Sát thương: **Theo luật game** (chưa đặt số), **Số cố định**, hoặc **Hệ số
  công** (vd 1,5 × ATK). Đây là cấu hình bàn giao, không tự thay đổi HP.
- Bấm **Đến thời điểm trúng** để xem frame tiếp xúc; **Dùng thử** có nhật ký
  marker. Các mốc độc lập, có Nhân bản/Xóa/Hoàn tác, lưu nháp/thư viện và gói.

Ví dụ cấu trúc mới (các trường skill/event hiện có vẫn giữ nguyên):

```js
event.aim = {x: 0, y: 42, mode: 'hits'};
event.anchor = 'target'; event.x = 0; event.y = 0;
event.targetMode = 'snapshot';
skill.hits = [{
  id: 'sword_1', name: 'Kiếm 1', eventId: event.id,
  mode: 'frame', frame: 4, at: 0, point: {x: 0, y: 42},
  damage: {mode: 'flat', value: 25}, scope: 'area', radius: 48,
  enabled: true, alignTarget: true
}];
// at chỉ dùng khi mode=time; frame chỉ dùng khi mode=frame.
```

Gói mới có `project.minRuntimeVersion: 3`; cần cập nhật **skill-runtime.mjs
v3** một lần ở game, rồi nhập JSON mới. Đây là bộ phát của Skill & VFX Studio,
**không phải character-skill-runtime.mjs** của PixelFX nhân vật. Runtime v3
đọc gói cũ v1/v2; format project/pack vẫn v1. Dùng bản runtime đã review ở game,
không thực thi `runtime.source` từ file do người chơi tùy ý tải lên.

`SkillPlayer.cast` nhận `{caster, target, targetId}`. `targetId` là chuỗi hoặc
null; tọa độ object `target` phải được game cập nhật tại chỗ nếu dùng follow.
`onEvent` phát `hit-marker` với `hitId`, `eventId`, `at`, `damage`, `scope`,
`radius`, `x/y`, `target`, `targetId`, `instanceId`, `authoritative: false`.
Mỗi ID chỉ phát **một lần mỗi lượt cast**, kể cả khi một tick đi qua nhiều mốc;
hit tại 0 giây phát ngay khi cast. Không gắn handler gây damage ở cả `hitAt`
và `hits[]`. Các API thuần `skillHits`, `skillHitTime`, `skillHitGeometry`
dùng được trên Node để đọc **bundle đã được server duyệt/cài đặt**.
Nếu tự gọi `drawSkillEvent`/các hàm transform thay vì SkillPlayer, truyền
`instance.project` và `instance.skill` cho aim theo nhiều hit; SkillPlayer đã
truyền sẵn. Luôn cập nhật runtime ở cả các đường preview/offline/game.

**Tích hợp chiến đấu:** server nạp cấu hình tin cậy, lên lịch từng `hitId` theo
thời gian cast và xác thực quyền dùng skill/vũ khí, mana, cooldown, khoảng cách,
phe, trạng thái, hình học va chạm và mục tiêu. Tính damage/crit/kháng/HP/loot ở
server rồi đồng bộ kết quả. Không tin con số, tọa độ hay marker từ client.
Với follow, server lấy vị trí mục tiêu theo thời gian mô phỏng; marker phía
client khi rớt frame chỉ dùng vị trí hiện tại, không tái dựng quá khứ. Hủy cast
và xử lý chết/mất mục tiêu ở game. Runtime Studio không tự tạo luật MMO đó.

## Tải sprite sheet, tự tách frame và thư viện ảnh riêng

Trong **Thư viện VFX → Tải ảnh / sprite sheet VFX · tự tách**, Studio mở bảng
xem trước thay vì đưa cả tấm ảnh vào một frame. Tự nhận hàng/cột dựa trên các
dải trống giữa ô; giữ nguyên một ảnh nếu không thấy lưới rõ. Đây không phải
AI có thể đoán chính xác mọi sprite sheet. Với frame dính nhau, nền phức tạp
hoặc lề không đều, chọn **Lưới tự nhập**, nhập cột/hàng và chỉnh lề/khe ngang,
dọc. Không tách từng hạt rời thành frame riêng. Không tự xóa ảnh gốc.

- Chạm ô/thumbnail để chọn hoặc bỏ từng frame; mặc định bỏ ô trống.
- Chỉnh FPS, thứ tự theo hàng, theo cột hoặc đảo ngược; có preview phát thử.
- Tất cả frame giữ chung canvas/kích thước và tâm neo, không tự co từng mảnh
  theo bounding box gây nhảy kích thước. Cắt PNG riêng cho từng frame, giữ alpha.
- **Tự bỏ nền phẳng ở mép ảnh** chỉ flood phần nền liên thông ra biên, không
  xóa toàn bộ màu trắng/đen bên trong hình. Chọn **Giữ nguyên alpha / màu ảnh**
  nếu không muốn xử lý nền. Đổi lưới/nền cần kiểm tra lại vùng chọn.
- PNG/WebP/JPG tối đa 8 MB, mỗi chiều ≤8192, tổng ≤16 triệu pixel; tối đa
  128 frame, FPS 1–60. Frame quá lớn được thu đồng đều về tối đa 2048 pixel
  mỗi chiều khi cắt; ảnh gốc vẫn lưu nguyên. Bộ PNG nhúng tối đa 32 MB.

**Tự lưu ảnh gốc và bộ frame vào thư viện** mặc định bật. Thư viện riêng
**Ảnh VFX & bộ frame đã lưu** nằm ngay dưới nút tải ảnh, dùng IndexedDB cùng
origin với Studio. Lưu cả ảnh gốc, PNG đã cắt, FPS, lưới, vùng chọn, thứ tự và
ID hiệu ứng. Mở bộ đã lưu → Thêm VFX vào timeline, không cần upload lại; dùng
được ở project khác. **Tách lại ảnh gốc thành bộ mới** tạo ID mới và giữ bản cũ.
Thư viện project **Skill / VFX đã lưu** vẫn riêng, giữ nguyên cả thiết kế skill.
Không tự đồng bộ trình duyệt/thiết bị; dùng **Sao lưu toàn bộ thư viện** / Nhập
bản sao để chuyển máy. Lỗi quota báo rõ, không xóa các bản lưu cũ.

Với ảnh đã đưa nguyên tấm vào timeline trước đây: chọn mốc → **Tách ảnh của
mốc đang chọn**. Nếu bật Thay ảnh của mốc, Studio chỉ đổi effectId của đúng
mốc đó, giữ ID mốc, thời gian, vị trí, chuyển động; không thêm một mốc chồng
lên ảnh cũ. Có Hoàn tác/Làm lại. Ảnh mốc cũ vẫn còn để phục hồi.

Project và skill-pack vẫn dùng `effect.frames[]` cũ; không cần runtime mới
cho tính năng tách ảnh. Gói game nhúng PNG các frame đang dùng, kích thước,
điểm neo và thời gian; không nhúng ảnh sprite sheet gốc hay toàn bộ thư viện
tài nguyên. Bản sao thư viện riêng mới có ảnh gốc để tách lại về sau.

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
Các trường chuyển động là tùy chọn, được thêm từ **skill-runtime.mjs v2**.
Gói xuất hiện tại dùng **v3**, map bundle có `skillRuntime.version: 3`;
bộ phát map vẫn v8. Cập nhật bộ phát skill
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
`hitAt` là thời điểm gửi tín hiệu hình ảnh cho gói chưa có `hits[]`; không tự
tạo hitbox hoặc gây sát thương. `hits[]` mới thay mốc đơn như phần trên.
Mốc VFX phải nằm hết trong thời lượng skill, có kiểm tra thay đổi và Hoàn tác/Làm lại.

## Xuất và tích hợp

- **Lưu project kèm ảnh**: `darkin-skill-project-v1`, để mở/chỉnh lại.
- **Xuất skill-pack + bộ phát**: `darkin-skill-pack-v1`, có `project` và
  `runtime.source` là mã skill-runtime.mjs độc lập, không import Night Camp.
- Chỉ kỹ năng đã thêm và hiệu ứng đang dùng được đóng gói; ảnh nhúng data URL.
  Không đổi ID/format chỉ vì đổi tên file. Nháp trình duyệt đầy thì lưu ra file.
- Map Studio → **Skill & VFX** → Nhập gói. Dùng thử skill trên map hoặc Chạy
  thử rồi phát từ người di chuyển. Map lưu `project.skillPack`, export có
  `skillRuntime.source` bên cạnh map `runtime.source`. Map-runtime v8 hỗ trợ
  ba hook lớp. HTML chạy thử độc lập đã gộp hai bộ phát và ảnh, không cần GitHub.

```js
import {SkillPlayer, loadSkillImages, validateSkillProject} from './skill-runtime.mjs';
const data = validateSkillProject(skillBundle); // hoặc mapBundle.project.skillPack
const images = await loadSkillImages(data);
const fx = new SkillPlayer(data, {onEvent(event) {
  if (event.type === 'cast') character.play(event.animation); // adapter game
  // hit-marker chỉ đồng bộ hình ảnh, không phải chứng cứ hit từ server
}});
fx.cast('fireball', {
  caster: character.position, target: selectedTarget.position,
  targetId: String(selectedTarget.id)
}); // position là object tọa độ chân, được game cập nhật tại chỗ
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
map-runtime.mjs v8 có beforeEntities/afterEntities/afterLighting. Dùng
skill-runtime.mjs v3, đọc aim/targetMode và hits[]. Fixed giữ chuyển động gốc;
aim.mode=hits khóa điểm tiếp xúc theo từng hit và thay dịch chuyển gốc. Truyền
targetId cùng object tọa độ chân; follow cần cập nhật object đó tại chỗ. Cast event gọi
clip tên animation của CutoutPlayer qua adapter; báo lỗi clip không có, không
đổi toàn bộ rig. Có cleanup khi đổi map, không tick hai lần hay nhân đôi VFX.
Hit-marker chỉ tín hiệu visual, không trừ HP từ callback client. Khi có hits[]
không chạy thêm hitAt. Server nạp chính bundle đã duyệt, lên lịch từng hitId
theo skillHitTime, chống trùng theo cast + hitId + entity, tính flat/multiplier
từ damage đã duyệt, chọn primary/area và kiểm tra radius theo đơn vị map.
Server MMO phải xác thực learned skill, rank,
mana, cooldown, trạng thái cast, range, hitbox và mục tiêu; server quyết định
sát thương/status/XP/loot. Không dùng kết quả cooldown/chi phí của client để
phát thưởng. Offline dùng local adapter cùng schema. SP/range/native multiplier
là metadata tham khảo, không tự hoàn thành logic chiến đấu gốc. Passive không
đặt vào nút cast; buff cần handler game thật. Thiếu handler thì báo chưa hỗ trợ.
Test hai người cùng cast, thay skill cùng ID, thay map, thiếu clip/VFX, hồi chiêu,
ngày đêm, file offline và save cũ. Publish Sites để tôi thử, giữ audience cũ.
```
