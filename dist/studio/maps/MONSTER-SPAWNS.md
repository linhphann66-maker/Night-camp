# Điểm sinh quái · Map Studio

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
Tải lại `map-runtime.mjs` version 3: bản tải xuống đã gộp bảng màu, dùng cả
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
Studio không đưa ảnh/AI/HP của quái Night Camp vào map. Game tự đăng ký loại quái:
`monsterRegistry.slime_green = ...`. Không tìm loại quái từ ID bãi hoặc đoán tên ảnh.

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
> Tích hợp MonsterSpawnController trong map-runtime.mjs version 3 hoặc adapter
> tương đương với pending reservation, giới hạn số quái, timer bắt đầu sau chết.
> Kiểm tra va chạm/nước/kích thước chân, hoãn nếu không có vị trí hợp lệ.
> Nối request với entity thật, asset/animation/AI/chiến đấu và sự kiện chết của game.
> Multiplayer: server là nguồn quyết định duy nhất, một controller/map instance;
> đồng bộ kết quả, không cho mỗi client sinh lại. Offline chạy cùng logic local.
> Dọn controller/entity/tác vụ async khi chuyển map, tránh nhân đôi khi vào lại.
> Test nhiều bãi cùng loại, nhiều loại quái, tắt bãi, thiếu registry, chặn toàn
> vùng, chết/hồi sinh, tải chậm, nhiều người cùng map và chuyển map nhiều lần.
> Triển khai lên Sites để tôi kiểm tra, báo rõ mã quái nào cần bổ sung template.
