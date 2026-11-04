# Điểm sinh quái · Map Studio

## Thư viện quái gốc · runtime version 6

**☰ → Điểm sinh quái → Thư viện quái Night Camp** có 432 mẫu thường, tinh anh
và boss từ bản game `game-20261025-1758`. Tìm bằng tên/ID/kiểu/map gốc, xem hai
tư thế và chỉ số theo cấp; chọn **Chọn quái này cho điểm sinh**, rồi đặt điểm.
Nếu đã chọn bãi, chỉ thay loại quái ở bãi đó, giữ ID, tọa độ, số lượng và hồi sinh.
Chọn riêng cấp 1–99 và tỷ lệ 0.1–5. Không dùng kích thước ảnh PNG thay kích thước thế giới.

Map cũ giữ nguyên, không tự nhúng hay thay mã quái khi mở. Nút **Nhúng dữ liệu
quái gốc của các điểm đã đặt** bổ sung những mã tìm thấy trong thư viện; giữ
mẫu đã có và báo mã riêng chưa tìm thấy. ID gốc không đổi. Tên Việt của mẫu phổ
biến là nhãn hiển thị; originalName và native.name vẫn giữ nguyên dữ liệu gốc.

**Chạy thử** hiện quái đã nhúng, di chuyển cơ bản, nút Đánh thử quái gần (mỗi
lần trừ khoảng 1/3 HP), ẩn quái chết và hồi sinh theo điểm. Có thể tắt Di chuyển
thử để xem kích thước. HP và hình ảnh lấy từ mẫu gốc; đòn thử không phải công
thức sát thương thật. Không gây sát thương người chơi, không phát loot, tiền,
EXP, không lưu kill vào project. Các hành vi đặc biệt như đạn, triệu hồi, đào
đất, chữa trị, kỹ năng boss chỉ được lưu dưới dạng dữ liệu, chưa chạy đầy đủ.

Xuất **nguyên map bundle**, không xuất từng quái: `project.monsterTypes` là
dictionary theo monsterId, gồm `poses.idle/attack` (src/w/h/ax/ay), `native`
(hệ, bán kính, tốc độ, loại AI, hệ số chỉ số…), `balance`, `drops`, `maps`,
`source`, `build`. Chỉ nhúng mẫu đang có điểm sinh (cả điểm tắt) và ảnh của chúng,
không đưa toàn bộ 432 mẫu vào bundle. Chỉ có một tư thế gốc thì attack dùng lại
idle đúng như game gốc. Tinh anh dùng ảnh gốc kèm native.hue, không giả có PNG riêng.

`nativeMonsterStats(template, level)` đối chiếu đủ 432 mẫu × 99 cấp với
`NC.monsterStats` trong source. Cân bằng boss, hệ số EXP và tỷ lệ job được giữ;
game mới có thể dùng cân bằng riêng thay vì mặc định lấy số này làm luật game.
`drops` là bảng dữ liệu vật liệu gốc, không tự phát vật phẩm/linh thạch trong game mới.

Dùng **map-runtime.mjs v6 từ bundle.runtime.source** (hoặc tải bộ phát mới).
Các helper mới: `loadMonsterImages(project, resolve)`, `drawMonsterSprite`,
`MonsterPreview`. Renderer nhận `entities: [{x,y,draw(ctx)}]` để xếp quái cùng
nhân vật/vật thể theo chân, trước khi tô ánh sáng. `DarkinMapPlayer.load` không
tự tạo AI/combat: game cần nối registry, controller và renderer. `MonsterPreview`
chỉ dành cho thử cục bộ, không dùng làm hệ thống chiến đấu/tiền tệ MMORPG.

Prompt bổ sung cho Codex game mới:

```text
Tích hợp bản map bundle mới cùng map-runtime.mjs v6. Đọc project.monsterTypes
theo monsterId; không đoán loại quái bằng ID bãi/tên file. Giữ nguyên ID map,
ID điểm và loại quái. Chỉ thay map đang cập nhật, không xóa map khác hoặc save.
Gộp mẫu gốc vào monsterRegistry có kiểm tra trùng ID; không tự ghi đè template
riêng nếu cùng ID khác nội dung. Nếu thiếu mẫu thì báo lỗi rõ, không thay bằng slime.
Spawn theo monsterSpawns với level (mặc định 1), scale (mặc định 1), count,
radius, enabled, respawnSeconds. Dùng nativeMonsterStats nếu chọn cân bằng gốc;
chân va chạm dùng native.r * scale. Nạp poses đã nhúng, giữ w/h/ax/ay, đổi pose
idle/attack, giữ hue của tinh anh, depth-sort theo chân và áp ánh sáng của map.
MMORPG: một spawner có thẩm quyền trên server cho mỗi map/channel instance.
Server xác thực di chuyển/đánh/chết, hồi sinh và thưởng; client chỉ gửi input.
Offline dùng cùng data/logic qua local adapter. Không dùng MonsterPreview để
phát loot/EXP/linh thạch thật. Dữ liệu native.kind là đầu vào chọn AI; triển khai
hoặc báo rõ loại chưa hỗ trợ, không tuyên bố có đủ AI gốc khi chỉ có ảnh.
Loot gốc là tham khảo; không tự đổi thành tiền linh thạch nếu chưa có thiết kế.
Test hai client, tránh spawn/reward trùng, chuyển map rồi quay lại, chết/hồi,
điểm bị chặn, unknown ID, map cũ, ảnh offline và giữ dữ liệu người chơi cũ.
```

## Dùng trong Studio

Vào **☰ → Điểm sinh quái → Chạm map để đặt điểm mới**. Chạm nơi muốn đặt,
sau đó mở lại mục Điểm sinh quái để chỉnh. Có thể chọn trong danh sách, kéo
dấu tâm bằng công cụ Chọn / kéo điểm quái, nhân bản, xóa, Hoàn tác/Làm lại.
Nút Về điểm đưa camera đến đúng điểm đã chọn. Các vòng không phải quái thật.

- `id`: mã điểm duy nhất trong map, ví dụ `bai_slime_01`.
- `monsterId`: mã loại quái trong registry của game, ví dụ `slime_green`.
  Hai bãi khác nhau có thể cùng sinh slime_green. ID bãi không phải ID loại quái.
- `name`: ghi chú tùy chọn, không dùng để nhận diện loại quái.
- `x`, `y`: tọa độ thế giới tại chân quái, cùng hệ tọa độ spawn người chơi.
- `radius`: vùng tròn sinh quanh tâm; 0 = đúng tâm. Không phải bán kính truy đuổi.
- `count`: số quái tối đa đang sống + chờ tạo tại điểm (1–50).
- `respawnSeconds`: chờ bao lâu sau khi chết để bù đúng một chỗ trống;
  0 = sinh đợt đầu một lần, không hồi sinh sau chết. Đếm bằng giây, không mili giây.
- `enabled`: tắt để giữ điểm trong thiết kế nhưng không sinh trong game.

Tối đa 256 điểm, tổng 1024 chỗ sinh mỗi map. ID chỉ gồm chữ Latin, số, _ hoặc -.
Game phân biệt điểm bằng cặp `(mapId, spawnId)`; hai map được dùng cùng ID bãi.
Các bản sao dungeon/channel phải có controller riêng theo ID instance của server.

Nút Kiểm tra vị trí sinh thử tìm chỗ đi được, không xuyên nước/vật cản. Đây là
kiểm tra lấy mẫu hữu hạn, không đảm bảo mọi loài đều vừa; game truyền bán kính
chân thực tế hoặc kiểm tra thêm canSpawn. Không có chỗ trống thì hoãn sinh,
không tự xóa cây/nước/vùng cản hay đẩy quái ra ngoài map.

Lưu project / Xuất map bundle đều giữ `monsterSpawns`, kể cả khi tắt dấu hiển thị.
Map cũ không có trường này vẫn mở được và được hiểu là không có điểm quái.
Thu nhỏ map mà làm mất điểm sẽ bị từ chối; dời hoặc xóa điểm trước, không mất dữ liệu âm thầm.
Đổi nền/ánh sáng không đổi các điểm sinh. Spawn người chơi và cửa giữ nguyên.

## Dữ liệu được xuất

Format map/bundle không đổi (`darkin-map-v1`, `darkin-map-bundle-v1`).
Tải lại `map-runtime.mjs` version 6: bản tải xuống đã gộp bảng màu, dùng cả
trình duyệt và Node cho logic dữ liệu. Bundle có `monsterSpawnSchema` giải thích
cách đọc, ngoài `runtime.source` như trước. Đặt tên file tùy ý, không đổi format.

```json
{
  "monsterSpawns": [
    {
      "id": "bai_slime_01", "name": "Bãi slime phía đông",
      "monsterId": "slime_green", "x": 640, "y": 480,
      "radius": 100, "count": 3, "respawnSeconds": 30, "enabled": true
    }
  ]
}
```

Đây là trường trong `bundle.project`, không thay cả project bằng đoạn ví dụ.
Mẫu được chọn từ thư viện có ảnh và dữ liệu HP/hành vi trong `monsterTypes`.
Game đăng ký mẫu từ đó hoặc từ registry riêng; bộ phát không tự chạy toàn bộ
AI gốc. Không tìm loại quái từ ID bãi hoặc đoán tên ảnh.

## Adapter game (offline hoặc máy chủ)

```js
import { MonsterSpawnController, monsterSpawnDefinitions } from './map-runtime.mjs';

// bundle là dữ liệu đã nạp, monsterRegistry là bảng template của game.
const points = monsterSpawnDefinitions(bundle); // bản sao các điểm đang bật
const spawner = new MonsterSpawnController(bundle, {
  monsterIds: Object.keys(monsterRegistry),
  actorRadius: 12, // hoặc kiểm tra kích thước từng loài trong canSpawn
  canSpawn(x, y, point) {
    return game.canPlaceMonster(point.monsterId, x, y);
  }
});

// Gọi mỗi tick ở đúng MỘT nơi. poll giữ chỗ ngay, kể cả tạo quái bất đồng bộ.
function updateSpawns(dt) {
  for (const request of spawner.poll(dt)) {
    void materialize(request);
  }
}
async function materialize(request) {
  let entity;
  try {
    entity = await game.createMonster({
      template: monsterRegistry[request.monsterId],
      id: request.instanceId,
      x: request.x, y: request.y,
      spawnId: request.spawnId, mapId: request.mapId
      // Truyền thêm level: request.level ?? 1, scale: request.scale ?? 1
      // theo API game; chọn stats từ nativeMonsterStats(template, level).
    });
    if (!entity) throw new Error('Tạo quái thất bại');
    // Adapter phải phát đúng sự kiện chết; tháo listener khi hủy map.
    entity.once('death', () => spawner.markDead(request.instanceId));
    spawner.confirm(request.instanceId);
  } catch (error) {
    // Nếu đã tạo một phần thì dọn entity trước khi trả chỗ.
    if (entity) game.destroyMonster(entity);
    spawner.reject(request.instanceId);
    console.warn('Không tạo được quái', request.monsterId, error);
  }
}
```

`game.*` và `entity.once` là ví dụ giao diện cần nối với game thật, không phải
API tự có trong DarkinMapPlayer. Có thể chỉ dùng points để nối spawner riêng
của game thay vì dùng controller đi kèm. `DarkinMapPlayer.getMonsterSpawns()`
trả cùng dữ liệu nếu đã dùng map player.

Controller không tự vẽ quái, tải ảnh, chạy AI/combat, lưu trạng thái qua reload
hay cung cấp server. Chết trùng sự kiện không tạo thêm lượt; pending cũng tính
vào giới hạn. Quái không được báo chết sẽ không hồi sinh. Khi unload map, dừng
tick/controller cũ, dọn entity/listener và hủy các tác vụ tạo đang chờ; không
khởi tạo controller mới mỗi frame hoặc mỗi người vào map. Constructor báo lỗi
nếu thiếu monsterId trong registry để không sinh nhầm loại.

MMORPG: chỉ server sinh/chết/hồi sinh theo từng map instance và đồng bộ entity
cho client. Client không chạy spawner lần nữa, không báo chết có thẩm quyền.
Offline: dùng cùng adapter ở local. Bộ runtime không tự chuyển giữa hai chế độ.

## Prompt gửi Codex cùng map bundle

> Tích hợp điểm sinh quái từ bundle.project.monsterSpawns theo monsterSpawnSchema.
> Giữ nguyên map, camera, spawn người chơi, cửa và cơ chế di chuyển hiện có.
> Dùng id làm spawnId, monsterId để tra registry quái của game; báo rõ mã chưa
> đăng ký, không đoán loại từ tên bãi/tên ảnh và không thay bằng quái ngẫu nhiên.
> Dùng tọa độ thế giới x/y, radius; không nhân cỡ ô hoặc áp camera vào vị trí sinh.
> Tôn trọng enabled, count, respawnSeconds; 0 giây là không hồi sinh.
> Tích hợp MonsterSpawnController trong map-runtime.mjs version 6 hoặc adapter
> tương đương với pending reservation, giới hạn số quái, timer bắt đầu sau chết.
> Kiểm tra va chạm/nước/kích thước chân, hoãn nếu không có vị trí hợp lệ.
> Nối request với entity thật, asset/animation/AI/chiến đấu và sự kiện chết của game.
> Multiplayer: server là nguồn quyết định duy nhất, một controller/map instance;
> đồng bộ kết quả, không cho mỗi client sinh lại. Offline chạy cùng logic local.
> Dọn controller/entity/tác vụ async khi chuyển map, tránh nhân đôi khi vào lại.
> Test nhiều bãi cùng loại, nhiều loại quái, tắt bãi, thiếu registry, chặn toàn
> vùng, chết/hồi sinh, tải chậm, nhiều người cùng map và chuyển map nhiều lần.
> Triển khai lên Sites để tôi kiểm tra, báo rõ mã quái nào cần bổ sung template.
