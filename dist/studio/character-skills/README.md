# Skill pixel trên nhân vật — PixelFX + Cutout

Mục **Skill pixel · nhân vật & vũ khí** nằm trong Studio nhân vật, dùng chung
preview, trang phục, điểm neo và animation. Nó **không** nằm trong cửa sổ VFX &
Skill cũ; hai hệ gói có định dạng và mục đích khác nhau.

## Quy trình thiết kế

1. Chọn nhân vật/trang phục, gắn vũ khí. Trong Animation, nạp hoặc tự tạo clip
   chém/cầm cung/niệm phép. Mỗi clip có `clip.id` cố định, không phụ thuộc tên file.
2. Mở **☰ → Skill pixel · nhân vật & vũ khí → Tạo skill**. Đặt tên, chọn vũ khí
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

37 preset gốc tô lại/biến đổi dáng nhân vật mẫu (ví dụ đóng băng, hồi sinh, một
số trạng thái). Studio đánh dấu và dùng biến thể **peripheral-only**: giữ phần
hiệu ứng bên ngoài, bỏ pixel vẽ lại thân mẫu; KHÔNG giả vờ đã retarget trọn lớp
đổi màu cơ thể lên trang phục bất kỳ. Muốn đóng băng/đổi màu đúng toàn bộ thân
của mỗi người chơi cần shader/mask theo nhân vật thực trong game. Vệt chém,
đạn, hạt, vòng phép thông thường không có hạn chế này. Hoạt ảnh diễn xuất của
dummy trên trang nguồn cũng không tự chuyển thành bộ xương Cutout: hãy chọn
animation nhân vật trong Studio. Atlas xuất chỉ lấy hiệu ứng, không vẽ dummy.

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

> Tích hợp gói darkin-character-skill-pack-v1 và runtime nhân vật mới, không thay
> nhân vật bằng ảnh trong video. Giữ nguyên map, trang phục, multiplayer và luật
> chiến đấu. Đăng ký skillId → animationId + weaponId + tracks/atlas; giữ nguyên
> ID khi reload và cập nhật, không suy từ tên file. Nhân vật phải cùng hợp đồng
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
