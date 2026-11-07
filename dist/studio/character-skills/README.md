# Skill & VFX trên nhân vật — PixelFX, ảnh và Cutout

Mục **Skill & VFX · nhân vật & vũ khí** nằm trong Studio nhân vật, dùng chung
preview, trang phục, điểm neo và animation. Kho PixelFX 244 mẫu và kho VFX gốc
228 mẫu/433 metadata kỹ năng nay có thể ghép trong **cùng một chiêu**. Nút
Skill & VFX cũng mở mục này, không mở một iframe với nhân vật giả lập riêng.

## Thêm VFX ảnh / sprite sheet ngay trên nhân vật

1. Chọn hoạt ảnh và trang bị của nhân vật, bấm **Tạo skill** hoặc tạo từ mẫu
   kỹ năng gốc, chọn vũ khí và **Gắn hoạt ảnh đang mở**.
2. Trong **Kho Skill & VFX · ảnh / sprite sheet**, chọn VFX → **Thêm VFX vào
   skill nhân vật**, hoặc tải ảnh. Bộ tách sprite sheet và thư viện **Ảnh VFX
   & bộ frame đã lưu** dùng chung với công cụ cũ, giữ ảnh gốc, lưới và frame.
3. Chọn mốc trong **Mốc hiệu ứng của skill**. Chỉnh thời gian, neo chân/tay/
   đầu/vũ khí, X/Y âm, góc, tỷ lệ, độ rõ, lớp trước hoặc sau nhân vật; bật kéo
   riêng để chỉ di chuyển mốc đang chọn. Có 15 chuyển động/easing, hiện/tan và
   hòa trộn thường/cộng sáng trong phần **Chuyển động mốc VFX đang chọn**.
4. **Thử skill** hoặc tua thanh thời gian skill để xem cùng động tác, người
   và vũ khí. Mốc ảnh chỉ có một lớp, không tự phân tách chiều sâu như PixelFX;
   dùng hai mốc/tài nguyên riêng nếu cần hiệu ứng bao cả trước lẫn sau.
5. Xuất cùng nút **skill + hoạt ảnh + vũ khí (.json)** hoặc ZIP kèm video.
   JSON nhúng frame PNG/WebP, kích thước, anchor ảnh, thời gian frame, chuyển
   động và ID. Không mang ảnh đầu/trang phục của nhân vật thử đè vào game.

Bộ VFX ảnh giới hạn tổng 32 triệu pixel giải mã khi thêm; loader gói giới
hạn tổng 32 triệu pixel và mỗi ảnh tối đa 16 triệu pixel, đọc lần lượt để
tránh tải đồng loạt nhiều ảnh lớn trên điện thoại. Cần giảm kích thước/số
frame nếu vượt giới hạn; Studio không tự bỏ frame hay đổi hoạt ảnh.

Trong **Mang thiết kế từ Skill & VFX cũ sang**, có thể nhập file project/pack,
nháp trình duyệt hoặc project đã lưu trong thư viện cũ. Giữ ID skill (báo lỗi
nếu trùng, không tự ghi đè), thời gian, ảnh và chuyển động; gắn với hoạt ảnh
đang mở và vũ khí của skill hiện tại. Công cụ cũ có các neo caster/target/world;
target chuyển thành mốc thử phía trước, caster/world thành gốc chân nhân vật
với offset cũ. Kiểm tra lại vị trí/tỷ lệ theo rig sau khi nhập. Không xóa nháp
hay bản thư viện cũ. Link công cụ độc lập cũ vẫn dùng được, Map Studio vẫn đọc
skill-pack v1 với skill-runtime v2 như trước.

Gói có VFX ảnh/mẫu dựng yêu cầu **character-skill-runtime.mjs v4**. Cập nhật
nguyên runtime ZIP mới vào game một lần, gồm `character-vfx.mjs` và
`effects/runtime.mjs`; đừng chỉ chép riêng một file runtime và bỏ dependencies.
Các gói PixelFX cũ vẫn đọc được, gói chỉ PixelFX tiếp tục có minRuntimeVersion 3.
Runtime Skill & VFX độc lập vẫn v2; không khôi phục cơ chế ngắm/multi-hit đã
hoàn tác. Mốc mục tiêu vẫn là điểm thử giả lập; game/server quyết định chọn
mục tiêu, hitbox và sát thương. Không tự áp mã `runtime.source` của file nhập.

VFX ảnh dùng `tracks[].kind: 'vfx'`, tham chiếu `effects[effectId]` dạng
`{kind:'vfx', sourceId:'vfx/…', effect:{id,name,group,frames,…}}`. Các trường
điểm phát/offset/thời gian nằm chung schema track; tham số motion/blend/easing
được giữ nguyên. PixelFX vẫn dùng atlas màu/ánh sáng trước/sau cũ. Loader,
controller, ZIP và video dùng chung adapter này, không bake dáng nhân vật vào ảnh.
Giấy phép MIT PixelFX chỉ áp dụng phần PixelFX, không cấp quyền cho ảnh VFX
gốc hay ảnh người dùng tải lên; giữ provenance/quyền tài nguyên tương ứng.

## Quy trình thiết kế

1. Chọn nhân vật/trang phục, gắn vũ khí. Trong Animation, nạp hoặc tự tạo clip
   chém/cầm cung/niệm phép. Mỗi clip có `clip.id` cố định, không phụ thuộc tên file.
2. Mở **☰ → Skill & VFX · nhân vật & vũ khí → Tạo skill**. Đặt tên, chọn vũ khí
   yêu cầu và bấm **Gắn hoạt ảnh đang mở**. Có thể không yêu cầu vũ khí cho chiêu
   hồi máu/buff. skillId được tạo một lần; nhân bản có ID mới, lưu/đổi tên giữ ID.
3. Chọn trong 244 hiệu ứng PixelFX, tìm `sword slash` / Quét kiếm hoặc nhóm Thánh.
   Thêm nhiều mốc, chỉnh bắt đầu, thời lượng, điểm phát, lệch X/Y, tỷ lệ, góc,
   seed và bảng màu. Số thập phân chấp nhận `0,5` hoặc `0.5`. Tổng chiêu tự đủ dài
   cho animation và đuôi hiệu ứng, tối đa 30 giây.
4. Bấm **Đến giữa mốc để chỉnh**, bật **Kéo riêng mốc đang chọn** để kéo trên
   preview. Chỉ mốc đang chọn di chuyển; các mốc khác không bị đổi. Tắt kéo để
   trở lại chỉnh xương. Đổi tay/điểm neo vũ khí ở mục Phụ kiện theo animationId
   như trước; gói xuất giữ các cấu hình ấy.
5. **Thử skill** tự nạp clip và trang bị đã liên kết; thanh thời gian skill cho
   phép xem cả đuôi VFX sau khi động tác đã kết thúc. Timeline animation cũ vẫn
   dùng để sửa keyframe, không trộn key VFX vào xương.
6. **Lưu vào thư viện** trong Bộ chiêu nhân vật để mở lại cả nhân vật đang dùng,
   vũ khí, ảnh, clip và thiết kế. Lưu rig/project bình thường cũng giữ thiết kế
   trong `project.characterSkills`. Thư viện là IndexedDB cục bộ theo origin;
   dùng Sao lưu toàn bộ thư viện trước khi xóa dữ liệu trình duyệt/đổi thiết bị.

## Gói game và video khác nhau

### Độ lệch âm và mốc mục tiêu

Ô Lệch X/Y và Góc dùng bàn phím đầy đủ để nhập dấu `-` trên iPhone; nhận cả
`-10.5` và `-10,5`. Có nút `− / +` bên cạnh: mỗi lần dịch X/Y 0,5 đơn vị rig,
góc 1 độ. X/Y cho phép −2000…2000, góc −3600…3600. Khi hướng phải, X âm là
sang trái và Y âm là lên trên; khi lật nhân vật, trục X của hiệu ứng lật theo.
Giá trị âm được giữ khi lưu, tải lại và xuất gói, không bị chặn ở 0.

**Mốc thử phía trước** (`anchor: target`) hiện là vị trí giả lập cách chân
nhân vật 85 đơn vị rig theo hướng đang nhìn. Đây KHÔNG phải mục tiêu quái hay
người chơi: chưa có chọn đối tượng, xoay hướng theo đối tượng, đường bay hoặc
bám mục tiêu. Runtime hiện chưa nhận tọa độ mục tiêu thật ở `cast()`; không
được mô tả việc chọn mốc này là đã tích hợp aim. Cần bổ sung hợp đồng mục tiêu
giữa Studio/runtime/game nếu muốn skill khóa hoặc ngắm vào đối tượng thật;
game/server vẫn phải kiểm tra khoảng cách, đối tượng hợp lệ và sát thương.

**Xuất gói ... (.json)** tạo `*.character-skill.json`:

```
format: darkin-character-skill-pack-v1
rigContract: nightcamp-humanoid-v1
skills[skillId] -> animationId, weaponId, hitAt, duration, tracks[]
animations[animationId] -> clip đã chỉnh, đầy đủ keyframe
weapons -> accessory-pack (ảnh vũ khí + điểm neo theo animationId)
effects[effectId] -> atlas PNG màu/ánh sáng, lớp trước/sau và pivot
attribution -> nguồn, commit, giấy phép, notice
```

Gói này KHÔNG mang ảnh đầu/trang phục của nhân vật thử sang đè nhân vật game.
Nó phát lại trên nhân vật khác dùng **cùng hợp đồng xương Cutout sáu bộ phận**.
Không thể tự áp một clip lên mọi hệ xương khác/Spine/3D. Cần retarget riêng nếu
đổi cấu trúc xương hoặc kiểu tọa độ. Tỷ lệ VFX và neo dùng đơn vị rig, không
pixel màn hình; lật theo hướng nhân vật.

**Xuất ZIP kèm video** chứa JSON trên, video `preview.webm` (hoặc MP4 nếu trình
duyệt chỉ hỗ trợ MP4), `preview-metadata.json` ghi skillId/animationId/weaponId
và nhân vật tham chiếu, `cutout-runtime.zip`, hướng dẫn và giấy phép. Video quay
nhân vật/trang bị thật đang thử, dùng cùng atlas và controller như game. Video
chỉ để xem/duyệt hình, không phải file chạy gameplay. Nếu máy không hỗ trợ
MediaRecorder/canvas.captureStream, JSON vẫn xuất được; thử trình duyệt hỗ trợ
quay canvas để có video. Khi quay, giữ tab mở và không thoát Studio.

## Giới hạn có chủ ý với hiệu ứng cơ thể

Kho được ghim commit `a84159688af3ca37a4be05a0d422b94451b2e24e` của
[patch-gg/pixelfx](https://github.com/patch-gg/pixelfx). Không dùng font riêng ở
gallery/fonts. Giữ LICENSE/NOTICE cho Patch, Hugo Duprez và phần mã liên quan.

37 preset gốc tô lại/biến đổi dáng nhân vật mẫu. Từ bản tách lớp mới, Studio
cấp cho chúng một actor tham chiếu KHÔNG có pixel/mặt nạ thân mẫu; vẫn giữ
vị trí đầu/ngực và kích thước để định vị hiệu ứng. Không xóa pixel theo một
lỗ hình người sau khi vẽ. Cột sáng, mặt cầu và hạt đi qua vùng đó vẫn liên tục;
thân và viền của dummy không được vẽ ngay từ đầu. Một số bộ phát hạt cần điểm
trên thân có guard rỗng/điểm phát thay thế, được ghi trong tools/pixelfx-external-compat.mjs.
Nguồn MIT vẫn giữ nguyên attribution; `sourceRevision` là commit upstream,
`bodySeparation: external-actor-v1` nhận diện cách thích ứng riêng của Studio.

### Ba lớp trước / thân thật / sau (runtime v3)

Thứ tự: **FX sau → nhân vật → lớp phủ thân thật tùy chọn → FX trước**.
Giữ **Cả trước & sau nhân vật** để khiên bao quanh người; hạt và mặt cầu phía
trước KHÔNG bị mặt nạ thân che. Bộ lọc Lớp nguồn chỉ chọn các lớp gốc, không
chuyển tất cả hiệu ứng ra sau. Không dùng một mặt nạ che chung cho mọi skill.

Trong từng mốc, **Lớp trên thân nhân vật thật** có Tắt / Tô màu / Tô sáng /
Viền sáng, màu và độ rõ riêng. Mặt nạ được vẽ theo đầu, trang phục, pose và
hướng của nhân vật ĐANG CHƠI mỗi frame; không lấy thân mẫu và không bake ảnh
nhân vật thử vào gói. Không tô vũ khí, mũ hay cánh. Lớp này theo thân thật,
không theo X/Y/scale/rotation của VFX; thời gian và độ rõ chung của mốc vẫn áp dụng.
Mặc định Tắt để không tự đổi ngoại hình. Đây là lớp tint/glow/outline tự chọn,
không phải tự retarget đầy đủ mọi chi tiết nứt băng, tan thân, tách mảnh và
biến hình của upstream; những hiệu ứng đó cần xử lý gameplay/shader riêng.

Gói mới có `minRuntimeVersion: 3`. Cập nhật TOÀN BỘ runtime trong ZIP mới,
gồm character-skill-body.mjs và renderer/avatar.js (có chế độ mask không phụ
kiện). Nếu game gọi `drawEffects` thủ công, gọi thêm lớp `body` giữa vẽ nhân
vật và lớp `front`; dùng `controller.draw()` thì đã có sẵn.

Các JSON cũ vẫn đọc được, nhưng runtime không thể phục hồi ánh sáng đã bị
khoét mất trong atlas cũ. Mở project hoặc nhập JSON cũ vào Studio rồi xuất
lại để tạo atlas mới; cache cũ bị loại theo bodySeparation, giữ nguyên các ID.
Video cũ cần xuất lại. Hoạt ảnh diễn xuất của dummy không tự chuyển thành
bộ xương Cutout: chọn animation nhân vật trong Studio như trước.

## Tích hợp vào game mới

### Sửa nền đen ánh sáng (runtime nhân vật v2)

Atlas ánh sáng mới có `lightEncoding: max-channel-alpha-v1`: alpha bằng kênh
RGB sáng nhất và RGB đã bỏ premultiply, giữ đúng năng lượng cộng sáng khi vẽ
bằng `lighter`. Không xóa màu đen theo ngưỡng: khói, bóng tối, nét viền và màu
tối có chủ ý trong lớp Color vẫn giữ nguyên. Preview Studio vẽ nền vào canvas
trước nhân vật/FX, giống cách game vẽ map rồi cộng ánh sáng; không cộng sáng
trực tiếp lên canvas rỗng với nền chỉ đặt bằng CSS.

Nếu đã tích hợp bản cũ: thay bộ runtime từ ZIP mới. Runtime v2 tự chuyển đổi
atlas Light cũ chưa có `lightEncoding` một lần khi nạp, không xử lý lại mỗi
khung hình và không đổi skillId/animationId/weaponId. Có thể dùng lại JSON cũ;
xuất lại từ thiết kế đã lưu sẽ tạo atlas trong suốt mới. Gói mới cần runtime
v2 để nhận biết cách mã hóa. Video cũ không tự thay đổi; cần xuất video lại.

Đây là **runtime nhân vật**, không phải map-runtime v8 và không thay bộ phát
skill-pack cũ. Cài toàn bộ runtime từ ZIP mới một lần. Có `player.mjs`,
`character-skill-runtime.mjs` và các module phụ thuộc cùng renderer/avatar.js.
Giữ nhân vật, map, animation cơ bản và gameplay đang có.

```js
import {CharacterSkillController} from './runtime/character-skill-runtime.mjs';

const pack = await fetch('/assets/skills/quet-kiem.character-skill.json').then(r => r.json());
// characterPlayer là CutoutPlayer của NHÂN VẬT ĐANG CHƠI, không phải nhân vật preview.
const skills = await CharacterSkillController.load(characterPlayer, pack, {
  ownedSkills: learnedSkillIds, // không mặc định sở hữu mọi skill trong file
  onEvent(event) {
    // cast-visual, hit-marker-visual, completed, cancelled: tín hiệu HÌNH ẢNH.
    // Không lấy marker làm bằng chứng gây damage/cộng tiền.
  },
});

// Chỉ khi người chơi thực sự sở hữu/chọn vũ khí, game cập nhật trang bị:
await characterPlayer.addAccessories(pack.weapons);
// pack.weapons không tự trang bị và không mở khóa skill khi load controller.
const result = skills.cast(skillId); // yêu cầu đúng weaponId + skill đã học
if (!result.ok) showReason(result.reason); // skill-not-owned / wrong-weapon / busy...

function frame(dt) {
  if (!skills.isCasting) characterPlayer.play(moving ? 'run' : 'idle');
  skills.update(dt, onNormalAttackHit); // đã cập nhật player: KHÔNG gọi player.update() lần hai
  skills.draw(ctx, heroFeetX, heroFeetY, characterScale);
}
```

Nếu game quản lý trang bị ngoài `player.spec.attachments`, truyền thêm
`getWeaponId: () => gameEquipment.weaponId`. Đồng bộ ID chuẩn, không dùng tên
file làm ID. Thay vũ khí giữa chiêu sẽ hủy phần trình bày đang phát. Khi đang
cast, đừng gọi locomotion `player.play('run'/'idle')` mỗi frame để ghi đè chiêu.

Load thêm gói: `await skills.addPack(nextPack)` hợp nhất theo skillId,
animationId, accessoryId và effectId; gói cùng ID là cập nhật có chủ ý, không
xóa skill khác. Cập nhật sẽ dừng chiêu đang phát; nên làm lúc nạp dữ liệu/thay
bộ chiêu. Không tự mở khóa skill mới: game cập nhật `skills.ownedSkills` theo
trạng thái nhân vật đã được server xác nhận. Không random ID lúc load/cast.
`mergeCharacterSkillPacks(a, b)` là hàm dữ liệu nếu game cần registry riêng.

MMORPG: server kiểm tra skill đã học, sở hữu/đang đeo vũ khí, mana, cooldown,
tầm đánh, mục tiêu và sát thương; gửi sự kiện cast đã duyệt và ID/phân bản dữ
liệu cho client. Offline dùng cùng cấu trúc dữ liệu và luật cục bộ. Runtime
này chỉ ghép animation + VFX, không tự tạo luật chiến đấu hay server.

## Prompt cho Codex game

> Tích hợp gói darkin-character-skill-pack-v1 và runtime nhân vật v4 mới (đủ
> character-vfx.mjs và effects/runtime.mjs trong ZIP), không thay
> nhân vật bằng ảnh trong video. Giữ nguyên map, trang phục, multiplayer và luật
> chiến đấu. Đăng ký skillId → animationId + weaponId + tracks/atlas; giữ nguyên
> ID khi reload và cập nhật, không suy từ tên file. Track kind=vfx dùng frame/
> mẫu dựng và motion/blend; track PixelFX giữ atlas trước/sau. Phát qua cùng
> CharacterSkillController, không bỏ một loại track khi ghép hai nguồn.
> Nhân vật phải cùng hợp đồng
> xương Cutout; báo lỗi nếu khác, không âm thầm áp sai. Người chơi chỉ cast khi
> đã học skill và đang dùng đúng weaponId. Phát clip đã xuất và VFX theo cùng
> timeline, đúng mốc bắt đầu, neo, lớp trước/sau, hướng lật và tỷ lệ rig. Không
> chồng hai vũ khí cùng loại. Không cập nhật player hai lần/frame, không để
> locomotion ghi đè animation giữa chiêu. Server giữ quyền mana/cooldown/hit/
> damage; marker runtime chỉ là hình ảnh. Video/preview-metadata chỉ tham khảo.
> Test cùng chiêu trên Traveler và Talon/trang phục khác: giữ nguyên ảnh đầu,
> thân và phụ kiện của người đang chơi; skill + vũ khí + animation vẫn khớp.
> Test chưa học skill, sai vũ khí, đổi vũ khí giữa chiêu, reload, cập nhật gói
> cùng ID, hai mốc FX độc lập và nhiều người chơi dùng cùng chiêu.
