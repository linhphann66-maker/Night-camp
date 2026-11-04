# Tương tác vật thể / đào linh thạch · Map Studio

## Thiết kế trên Studio

Đặt cây, đá hoặc ảnh riêng như trước. Chọn vật thể → **Cấu hình tương tác vật thể**,
hoặc **☰ → Tương tác & linh thạch** rồi chọn đúng bản sao trong danh sách.

1. Đặt ID dễ nhớ, ví dụ `linh_thach_01`, `cay_thu_thap_01`. ID chỉ gồm chữ
   Latin, số, _ hoặc -, tối đa 100 ký tự, duy nhất trong map.
2. Bật **Cho phép tương tác**, chọn Đào linh thạch, Thu thập hoặc Tùy chỉnh.
3. Chỉnh mã hành động, chữ trên nút, khoảng cách, thời gian thao tác.
4. Điểm thao tác mặc định 0,0 tại neo ảnh; có thể chỉnh lệch X/Y theo tọa độ
   local của ảnh. Điểm này đi theo scale/rotation/flip, không dùng tâm tán cây.
5. Đào/thu thập: chọn resourceId và khoảng lượng nhận nguyên min/max (bao gồm hai đầu).
   `spirit_stone` được quy ước là **Linh thạch**. Mặc định 3–8 chỉ là gợi ý thử.
6. Bật Biến mất sau khi hoàn tất và đặt giây tái xuất hiện. Giá trị 0 = không hồi
   nếu đã biến mất. Không bật Biến mất thì giữ ảnh nhưng vẫn có thời gian hồi.
   Tùy chỉnh không tự phát tài nguyên, game xử lý theo actionId.

Cấu hình nằm trên **từng vật thể đã đặt**, không nằm trên tài nguyên ảnh dùng chung.
Hai viên đá dùng cùng PNG được cấu hình khác nhau. Nhân bản giữ cấu hình nhưng
sinh object.id mới; thay ID không được trùng vật thể khác trong map. Không tự bật
tương tác cho đá/cây cũ. Thay loại ảnh không tự biến mọi tảng đá thành linh thạch.

## Mang sang game: chỉ một map bundle

**Xuất map bundle + bộ phát** rồi đưa nguyên file đó để Codex thay map hiện tại.
Không xuất/nhập từng vật thể riêng, không cần gói resource-object riêng.
Ảnh đang dùng vẫn được nhúng trong map như trước. Cấu hình và ID đi cùng map.

- Định danh vật thể: `(mapId, objectId)`; các map khác nhau có thể dùng cùng objectId.
- Định danh hành động: `actionId`, ví dụ mine_spirit_stone. Nhiều node dùng chung handler.
- Định danh tài nguyên: `reward.resourceId`, ví dụ spirit_stone. Không suy ra tài nguyên
  từ tên file ảnh, loại rock hoặc chính objectId.
- Format vẫn là darkin-map-v1 / darkin-map-bundle-v1, thêm trường interaction tùy chọn.
- Bundle mới có interactionSchema và map-runtime.mjs version 4. Tải lại runtime
  mới nếu game dùng bản cũ; bản raw trong repo còn cần native-ground.mjs, bản tải
  từ Studio đã gộp sẵn. Không đổi tên format khi đổi tên game/file.

Ví dụ trên một phần tử của bundle.project.objects:

```json
{
  "id": "linh_thach_01",
  "asset": "qh_crystal",
  "x": 400, "y": 400,
  "interaction": {
    "enabled": true, "type": "mine",
    "actionId": "mine_spirit_stone", "label": "Đào linh thạch",
    "range": 96, "point": {"x": 0, "y": 0},
    "durationSeconds": 3, "respawnSeconds": 30, "deplete": true,
    "reward": {"resourceId": "spirit_stone", "min": 3, "max": 8}
  }
}
```

Đây là phần minh họa; giữ đầy đủ scale/rotation/flip/layer/collider và các trường
vật thể trong bundle thật. Đổi ID sau phát hành có thể làm mất liên kết cooldown
trong save, nên giữ ID ổn định nếu vẫn là node cũ.

## Chạy thử trong Studio và HTML offline

Bấm Chạy thử, đi gần vật thể đã bật. Nút thử đổi sang ⛏ Đào linh thạch; bấm
để chạy thanh tiến độ, vật thể rung nhẹ. Hoàn tất mới có thông báo nhận lượng
mô phỏng, vật thể biến mất rồi hồi lại đúng cấu hình. Di chuyển, chết hoặc ra xa
hủy tiến độ. Có thể bấm Hủy. Dừng/chạy lại sẽ reset mô phỏng và khôi phục vật thể.

Ảnh chỉ rung ở transform vẽ, không làm thay đổi điểm neo/vị trí/va chạm lưu trong
project. Node đã ẩn bỏ footprint trong mô phỏng và khôi phục khi hồi lại. Cây/đá
không tương tác và các bản sao khác không bị sửa. Trạng thái đào đang dở, tiền
mô phỏng và thời điểm hồi tạm không ghi vào map project/bundle.

`InteractionSimulator` là **mô phỏng một người dùng để thiết kế**, không có wallet,
ledger, persistence, khóa multiplayer hoặc xác thực server. Không dùng sự kiện
reward của simulator phía client làm bằng chứng cộng tiền thật.

Runtime có các helper dữ liệu độc lập:

```js
import {interactionDefinitions, nearestInteraction} from './map-runtime.mjs';
const nodes = interactionDefinitions(bundle); // mapId, objectId, assetId, world x/y, config
const target = nearestInteraction(bundle.project, player, {
  isAvailable: objectId => authoritativeNodeState[objectId]?.status === 'ready',
  canInteract: (object, actor) => game.canUseNode(actor, object)
});
```

`authoritativeNodeState` và `game.canUseNode` là adapter game cần triển khai, không
phải biến sẵn trong bộ phát. Helper gần nhất chỉ xét khoảng cách/các predicate,
không tự đảm bảo đường đi, line-of-sight, nghề nghiệp hoặc quyền nhận thưởng.
`DarkinMapPlayer.getInteractions()` trả cùng danh sách nếu đã dùng map player.
Renderer nhận objectState(id) → {hidden, shakeX, shakeAngle}; va chạm nhận
isObjectActive(id). Game phải nối cùng trạng thái authoritative vào cả hai.

## Prompt giao Codex cùng map bundle

Hãy tích hợp tương tác vật thể và cơ chế đào linh thạch vào game hiện tại.

### A. Nạp nguyên map mới

- Sao lưu map cũ rồi thay bằng toàn bộ map bundle tôi cung cấp. Không yêu cầu
  tôi tách từng cây/đá hoặc xuất một gói vật thể riêng.
- Giữ toàn bộ ID, ảnh, terrain, đường cong, spawn, cửa, điểm quái, vị trí,
  neo/scale/rotation/flip/layer/collider cùng objects[].interaction.
- Đọc interactionSchema trong bundle. Nhận dạng bằng mapId + objects[].id,
  kể cả với ảnh tải lên. Bản sao cùng ảnh không có nghĩa là cùng một node.
- enabled=false hoặc không có interaction thì là trang trí, không tự cho đào.
- Tái sử dụng loader/runtime hiện tại, cập nhật map-runtime.mjs v4 hoặc adapter
  tương đương; giữ minimap/fog/clock, nhân vật/animation, multiplayer và save nhân vật.

### B. Tương tác và nút hành động

- Tìm node sẵn sàng gần nhất trong range từ chân nhân vật đến điểm thao tác
  local đã chuyển sang world bằng scale/rotation/flip. Không nhân cỡ ô hoặc camera.
- Với type mine và actionId mine_spirit_stone, khi đủ điều kiện, đổi nút đánh
  hiện có sang biểu tượng cuốc và chữ Đào; không tạo thêm nút đè lên nút đánh.
- Ra khỏi vùng hoặc node không sẵn sàng thì trả nút về đánh. Nếu đang có mục
  tiêu chiến đấu/đang giao chiến, ưu tiên chiến đấu hoặc yêu cầu chọn rõ node,
  tránh tự đào khi người chơi định đánh quái cạnh tảng đá.
- Gửi yêu cầu bắt đầu bằng mapId/objectId, không gửi lượng tiền do client tự chọn.
- Có trạng thái ready → mining → depleted/cooldown → ready; thanh tiến độ theo
  durationSeconds, nhân vật đứng đào, node rung nhẹ khi thao tác, không dời node gốc.
- Nếu bundle nhân vật chưa có clip đào, dùng fallback hợp lệ từ clip đang có
  hoặc báo phần hoạt ảnh còn thiếu; không gọi clip mining không tồn tại và
  không làm hỏng idle/walk/run/attack. Biểu tượng cuốc và logic đào không đòi
  hỏi phải thay toàn bộ bộ asset nhân vật.
- Di chuyển, chết, rời map, bị ngắt theo luật combat hoặc disconnect phải hủy.
  Không nhận một phần thưởng khi mới bắt đầu/bấm từng nhát/chưa đủ thời gian.
- generic gather/custom gọi handler theo actionId, không đoán tất cả vật thể đều là tiền.

### C. Linh thạch là tài nguyên và tiền tệ chính

- Đăng ký resource/currency ID spirit_stone, tên tiếng Việt Linh thạch, số dư
  nguyên không âm, mặc định 0 cho nhân vật chưa có. Hiển thị số dư trên HUD/ví.
- Dùng một nguồn số dư chuẩn, ví dụ wallet.spirit_stone. Nếu hiện trong túi thì
  đó là view của cùng nguồn, không cộng thêm cả item lẫn wallet thành hai lần.
- Không tự xóa/đổi số dư vàng hay tiền cũ. Nếu game đã có spirit_stone thì nối
  vào nguồn hiện có thay vì tạo loại tiền thứ hai. Chưa tự sửa giá shop, chi phí
  đột phá, nhiệm vụ hoặc các bảng cân bằng ngoài phạm vi này.
- Khi đào thành công, server chọn số nguyên ngẫu nhiên trong reward.min..max
  từ cấu hình map tin cậy; resourceId phải được đăng ký hợp lệ.

### D. Multiplayer và chống nhận trùng

- Server là nguồn quyết định: kiểm tra map instance, node tồn tại/sẵn sàng,
  enabled, range, vị trí chân hợp lệ, LOS/vật cản, nhân vật còn sống, trạng thái
  combat và thời gian đào. Không nhận client báo đã đào đủ hoặc tự gửi reward.
- Mặc định mỗi node chỉ có một người đào tại một thời điểm. Người thứ hai nhận
  báo node bận, không tạo thêm channel hoặc nhận thưởng trùng.
- Hoàn tất phải cập nhật node và cộng ví/ledger một cách atomic, idempotent
  theo map-instance + objectId + chu kỳ khai thác + transactionId. Retry, spam,
  reconnect hoặc hai request đồng thời không được nhận tiền hai lần.
- Thành công thì ẩn node trên mọi client và đồng bộ trạng thái va chạm tương
  ứng. Không xóa định nghĩa object khỏi map bundle; chỉ thay runtime state.
- Đặt respawnAt từ thời điểm hoàn tất. Đủ respawnSeconds thì phục hồi node;
  giá trị 0 nghĩa là không hồi nếu node đã biến mất, không phải hồi ngay lập tức.
- Persist số dư, node depletion/cycle/timestamp theo quy tắc map instance để
  restart/reconnect không reset tiền hoặc tạo cơ hội farm lại sai quy định.
- Khi node hồi, tránh làm người chơi kẹt trong footprint mới xuất hiện.
- Offline dùng cùng flow local và lưu riêng; không lấy tiền offline tự nhập
  vào server online. InteractionSimulator chỉ để tham khảo/mô phỏng, không
  phải backend chống gian lận hoặc bộ xử lý giao dịch tiền thật.

### E. Kiểm tra và bàn giao

- Test nhiều node cùng ảnh nhưng ID/cấu hình khác nhau, ID trùng, node tắt,
  quay/lật/scale/điểm lệch và đá/cây ảnh riêng.
- Test ngoài range, bị tường ngăn, đi xa/di chuyển/chết khi đào, min=max,
  min..max, nhận một lần, biến mất và hồi đúng timer, hồi 0, node không biến mất.
- Test hai người cùng đào, spam nút, request retry, mất mạng, reconnect,
  restart server, đổi map và thay map bundle mà vẫn giữ save nhân vật.
- Test nút đánh đổi đúng thành đào và trả lại, không hỏng joystick/mobile HUD,
  minimap, avatar/cảnh giới, đồng hồ, quái hoặc combat đang có.
- Triển khai lên Sites của game hiện tại và báo rõ phần đã kiểm tra, phần còn
  thiếu backend. Không báo hoàn tất chỉ vì đã copy cấu hình vào game.
