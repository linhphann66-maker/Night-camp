# Map Studio v1

Trong Studio chọn **☰ → Vẽ & tạo map**, hoặc nút Vẽ map trên desktop.
Map lưu riêng với nhân vật/pet/cánh và không ghi đè các map gốc.

## Tài nguyên nào được dùng lại?

`catalog.json` được tạo từ manifest và khai báo vật thể của bản client
`game-20261025-1758`, bằng `node tools/build-map-studio.mjs`.
Danh mục v1 có cây, đá, cầu, bụi/cỏ/trang trí thấp; không tự đặt nhà, NPC hay
nhân vật gốc vào map mới. Bạn có thể tải PNG/WebP/JPG riêng làm vật thể hoặc
ô nền lặp cho phần tài nguyên còn lại. Ảnh riêng tối đa 8 MB / 16 triệu pixel.
Vật thể nên dùng PNG/WebP nền trong suốt; JPG phù hợp hơn cho ảnh nền lặp.

Phần lớn nền của game gốc là code, không có ảnh grass-tile.png để trích.
Bảng nền dùng palette cỏ/đất/rêu/nước của `fieldgen.js` và cách kẻ đá lát
150×105 của `world.js`, dựng lại thành các ô nền thủ tục có seed. Cát/nước và
giao diện cọ là bản thích nghi cho editor, không tuyên bố tái tạo nguyên pixel,
autotile hay shader nước của client gốc. Giữ seed để nền ổn định.

## Bảng màu gốc theo map Night Camp

Vào **☰ → Nền & cọ → Nền gốc Night Camp**. Có 156 mẫu theo map, gồm khu chính,
khu phụ B và phụ bản, trích từ client `game-20261025-1758` trong repo. Có tìm
theo tên Việt của khu chính, tên gốc hoặc ID; khu phụ giữ tên gốc để không đoán
sai tên. Hai ảnh nhỏ cho xem trước ngày/đêm của mẫu đang chọn.

- **Chọn màu để tô từng vùng:** các ô Nền chính, Đường đất, Bờ/cát, Nước, Nước
  sâu, Đất trồng, Vách đá… chỉ hiện khi có màu tương ứng trong dữ liệu nguồn.
  Có thể dùng màu từ nhiều map trong một bản đồ. Chọn màu chưa tự thay map.
- **Áp dụng bảng màu & ánh sáng:** đổi nền thủ tục và các kênh màu có tương ứng,
  giữ nguyên ảnh nền tải lên, vật thể, vị trí, tuyến đường cong, spawn, cửa và
  vùng cản. Kênh không có trong bảng mới giữ nguyên, không đoán màu thay thế.
  Có Hoàn tác/Làm lại. Ô mới khi mở rộng map dùng nền chính của mẫu hiện tại.
- **Dùng seed gốc:** lấy seed của map nguồn để pha các mảng nền; bỏ chọn để
  giữ seed đang dựng. Không dịch chuyển vị trí vật thể hoặc đường.
- **Dùng sắc sáng / độ tối riêng:** giữ đúng tint và mức tối tối thiểu của map.
  Nghĩa địa/rừng tối vẫn tối vào ban ngày; phụ bản luôn tối như dữ liệu gốc.
  Áp dụng mẫu giữ giờ đang xem, đưa cường độ ánh sáng môi trường về 100%.
  Tắt lựa chọn này để chỉ dùng màu vật liệu và ánh sáng Ngày/Đêm chung.

Không lấy màu icon/minimap hay chọn màu gần giống bằng mắt. `native-ground.mjs`
là dữ liệu sinh bằng `node tools/build-native-ground.mjs`: palette ngày/đêm,
base/patch, độ biến thiên, tỉ lệ noise, màu đường/nước và ánh sáng riêng.
Các phương trình được đối chiếu bằng kiểm thử với đoạn gốc `fieldgen.js`,
`camp.js`, `dungeongen.js`; tint/độ tối được đối chiếu với các wrapper `fields*`.

Đây là **màu và nền vật liệu**, không tự phục hồi bố cục, cây, đèn, sương, bóng
vách, trang trí hay shader nước của cả map gốc. Màu sàn hang được lấy ở vùng
sàn không có bóng vách, không tự tạo vách hay phòng. Độ phân giải preview và
các ánh sáng cục bộ trong game vẫn có thể làm ảnh chụp khác nhau.

Map cũ không tự đổi màu. Thiết lập nằm ở `project.environment` và các ID nền
`nc_<biome>__<channel>`. Nước/nước sâu/hồ ngầm vẫn chặn di chuyển trừ khi có
cầu hoặc lớp đường đi nước; màu đất/đá không tự tạo thêm vật cản.

**Khi đưa sang game mới, tải lại `map-runtime.mjs` từ Studio.** File tải xuống
đã gộp toàn bộ bảng màu và không có import phụ thuộc; HTML offline cũng đã
nhúng đủ. Tên `DarkinMapPlayer` và format map không đổi. Nếu lấy trực tiếp mã
nguồn thô trong repo thay vì bản tải xuống, phải mang cả `native-ground.mjs`.

## Ngày / đêm & ánh sáng

Bấm **☀ Ngày / ☾ Đêm** ở đầu màn hình để đổi nhanh, hoặc mở **☰ → Ngày /
đêm & ánh sáng** rồi chọn **Mẫu đêm · đồng cỏ** để thử phong cách nền trong game.
Map cũ chưa có thiết lập vẫn mở ở ban ngày, không tự ép chuyển đêm.

- Ban đêm có bảng màu riêng: cỏ xanh rêu, đường xám xanh, nước xanh sẫm;
  không chỉ là phủ một lớp đen lên bảng màu ban ngày.
- Theo giờ: thời điểm cố định 0–23.75, bình minh 5–7h và hoàng hôn
  17.5–19.5h, chuyển màu nền và ánh sáng ấm như công thức trong client lưu trữ.
  Đây là preview theo giờ, chưa tự chạy chu kỳ/thời gian online.
- Sắc xanh môi trường: 0–100%, áp lên cả nền, ảnh vật thể và nhân vật trong
  `drawActor`. Giảm về 0 chỉ bỏ nhuộm màu, vẫn giữ bảng màu nền đêm.
- Tối viền và quầng sáng quanh người thử có thể bật riêng. Khi chỉnh map chưa
  chạy thử, không có người thử nên không vẽ quầng sáng.
- Mềm mép cỏ/đất/cát và chi tiết cỏ/đốm nền bật riêng. Không làm thay đổi
  vùng đi lại, nước hoặc vùng cản. Không tự recolor nội dung ảnh nền tải lên.

Các trường nằm trong `project.lighting` và đi theo project, bundle, nháp,
Hoàn tác/Làm lại và web offline. Web offline có nút **Ánh sáng đã lưu** để
trở về thiết lập được xuất sau khi thử màu khác. Cả loader và renderer dùng
cùng một mã bộ phát; không cần tải shader từ game gốc.

Palette/noise đồng cỏ dựa trên `fieldgen.js`/`core.js`; màu đá từ `world.js`,
chu kỳ sáng tối từ `game.js` và sắc ấm bình minh/hoàng hôn từ `minimap.js`.
Ánh sáng là bản dựng lại cho editor: chưa có đèn đuốc/vùng sáng khai báo riêng,
đổ bóng động hoặc toàn bộ hiệu ứng của game gốc, không cam kết giống từng pixel.

Thư viện đọc ảnh từ GitHub như Studio hiện tại. Khi lưu/xuất, chỉ ảnh đang
được dùng và ảnh bạn tải riêng được nhúng vào file; không tải cả kho game.
Việc có file không đồng nghĩa có giấy phép phát hành: kiểm tra quyền sử dụng
ảnh gốc trước khi công bố game thương mại/công khai.

## Tạo map

1. Nền & cọ: chọn cỏ, đất, cát, đá lát, nước hoặc ảnh nền riêng rồi kéo để tô.
   Chọn cỡ cọ 1/3/5/7 ô. Mỗi nét là một bước Hoàn tác.
2. Vật thể: chọn ảnh rồi chạm map để đặt. Chọn/kéo để di chuyển; chỉnh tỷ lệ,
   góc, lật, neo ảnh và lớp vẽ trong Vật thể đang chọn. Nhân bản/xóa có Hoàn tác.
3. Vùng cản: dùng công cụ vẽ/xóa vùng cản để chặn địa hình; với từng vật thể
   chỉnh footprint elip/chữ nhật quanh gốc. Không cản theo cả PNG/tán cây.
4. Cầu: bật Vùng cản để thấy khung mặt đi màu xanh; chỉnh đúng mặt sàn thực
   tế của ảnh. Khung gợi ý không phải nhận diện ảnh tự động. Có thể tô thêm
   Đường đi trên nước; chỉ mở trên nước, không bỏ qua tường/vật cản.
5. Đặt Spawn trên chỗ trống, bấm Chạy thử. Dùng WASD/phím hướng, nút hướng
   hoặc chạm điểm đến. Đây là dấu chân/người thử đơn giản để kiểm tra map,
   không tự nhập NPC hay nhân vật Night Camp. Chạm điểm đến là đi thẳng có
   trượt va chạm, chưa có A* tự tìm đường vòng.
6. Map, spawn & cửa: chỉnh tên/ID/kích thước/seed, khai báo cửa và map đích.
   Chạy thử báo khi vào cửa. Editor không tự nạp map đích hoặc dựng backend.

Góc nhìn: dùng Bàn tay kéo, nút +/- hoặc bánh xe chuột; Vừa map để nhìn toàn
bộ. Mobile có menu riêng cho từng mục, mặc định chỉ preview/vẽ map.

## Ảnh riêng: che nhân vật và chạm đất

Ảnh riêng dạng vật thể cao có **Mờ khi che nhân vật** và **Bóng chạm đất**.
Chọn vật thể rồi mở **Vật thể đang chọn → Loại vật thể & chạm đất** để bật/tắt
hoặc đổi loại ảnh. Đây là thuộc tính dùng chung cho các bản sao cùng tài nguyên;
đổi loại không đổi kích thước, tỷ lệ hay tự tạo vùng va chạm.

- Ảnh tải lên mới lấy neo ở đáy vùng có nét vẽ, không phải đáy cả khung PNG.
  Ảnh không bị crop; rộng/cao giữ nguyên. Có thể chọn loại **Cây / vật che cao**
  khi tải lên. Cây tải lên không bị nhân thêm hệ số thu nhỏ của thư viện cây gốc.
- Ảnh riêng cũ không có trường mới vẫn được hỗ trợ: điểm chạm đất hiển thị,
  thứ tự trước/sau và bóng dùng gốc nét vẽ. Không tự sửa tọa độ/vùng cản trong
  project cũ. Viền trong suốt không làm nhân vật bị tính là đứng sau cây.
- Mờ chỉ xảy ra khi phần ảnh có nét vẽ che vùng thân/đầu người thử. Khi đi ra
  trước, ra khỏi ảnh hoặc qua lỗ trong tán cây, ảnh trở lại rõ. Vật thể lớp
  ground nằm dưới nhân vật không cần mờ. Bộ phát dùng mẫu alpha có cache,
  không đọc toàn bộ pixel ảnh lại mỗi frame.
- **Đặt neo về gốc ảnh · giữ nguyên hình** sửa neo cho ảnh đã có trong map.
  Các bản sao quay/lật/phóng to vẫn giữ nguyên hình và vùng cản ở vị trí cũ;
  chỉ tọa độ gốc và tọa độ cục bộ vùng cản được quy đổi. Có Hoàn tác/Làm lại.
  Nếu gốc thực nằm ngoài map, thao tác bị từ chối để không tự cắt/dời cây.
- **Sắp trước/sau và bóng theo** cho chọn gốc ảnh hoặc neo thủ công. Chỉnh
  neo X/Y thủ công sẽ dùng neo đó. Bóng nhẹ là tùy chọn; tắt nếu ảnh đã có bóng.

Nhận diện alpha chỉ ước tính chân theo vùng thấp nhất có nét vẽ, không hiểu
ngữ nghĩa của ảnh. Ảnh nền trắng/JPG không được tự tách nền; ảnh bất thường
có thể cần chỉnh neo thủ công. Dữ liệu mới nằm ở `assets[id].grounding`
(`image`/`anchor`), `fadeBehind`, `groundShadow`. Project/bundle/HTML offline
giữ các lựa chọn này. Game mới cần tải lại `map-runtime.mjs` mới nhất.

## Đường cong tự do

Vào **☰ → Đường cong**, chọn chất liệu **Đất / Cát / Đá lát**, độ rộng,
mềm mép và độ uốn, rồi bấm **Vẽ đường mới**. Trên desktop mục này ở cột trái.

1. Chạm từng điểm trên map, không phải kéo cọ theo ô. Đường uốn qua các điểm.
   Hai điểm tạo đường thẳng; ba điểm trở lên tạo tuyến cong. Các đầu bo tròn.
2. Thanh nổi có **Bỏ điểm cuối**, **Hoàn tất**, **Hủy**. Chưa Hoàn tất thì
   đường chỉ là bản nháp vẽ, chưa vào project. Lưu/xuất/chạy thử yêu cầu hoàn
   tất hoặc hủy trước, tránh vô tình xuất thiếu đường.
3. Sau khi hoàn tất, kéo các chấm được đánh số để sửa đường. Mỗi lần kéo là
   một bước Hoàn tác; thả tay rồi bấm Hoàn tác/Làm lại. Kéo giữ độ lệch lúc
   chạm để không làm điểm nhảy vào giữa ngón tay.
4. Trong mục Đường cong có danh sách đường và điểm, tọa độ X/Y, chèn/xóa
   điểm, nhân bản/xóa đường. **Chèn điểm** rồi chạm gần đoạn muốn thêm điểm.
   Đường cần ít nhất hai điểm; muốn bỏ cả đường dùng **Xóa đường**.
5. Rộng 8–512 đơn vị thế giới, không phụ thuộc zoom. Mềm mép 0–90%; độ uốn
   0–100%, mức 0 là các đoạn thẳng gấp khúc, vẫn bo góc. Đường được cắt ở
   biên map, nằm trên nền và dưới mọi vật thể, nhận ánh sáng ngày/đêm.

Đường là lớp ảnh nền riêng, **không thay đổi terrain, nước hay va chạm**.
Muốn đi qua nước phải thêm cầu hoặc vùng đường đi nước như trước. Các đường
vẽ sau đè lên đường vẽ trước. Giới hạn 128 đường, 256 điểm/đường, tổng 4096
điểm/map. Thu nhỏ map mà làm điểm đường ra ngoài biên sẽ bị từ chối; editor
không âm thầm xóa điểm. Độ uốn lớn ở góc gấp có thể làm đường vòng ra ngoài
đa giác các điểm; kéo các điểm xa nhau hơn hoặc giảm độ uốn nếu không muốn.

Project/bundle vẫn dùng `darkin-map-v1` / `darkin-map-bundle-v1`, không đổi tên.
Map cũ thiếu `roads` vẫn đọc được. Ví dụ dữ liệu mới:

```json
"roads": [{
  "id": "road_1", "material": "dirt", "width": 120,
  "softness": 0.25, "smoothness": 0.8,
  "points": [{"x": 200, "y": 200}, {"x": 450, "y": 500}, {"x": 800, "y": 220}]
}]
```

**Game mới phải thay `map-runtime.mjs` bằng bản tải mới từ Studio**. Bộ phát
version 2 xuất `MAP_RUNTIME_VERSION = 2` và vẫn dùng `DarkinMapPlayer` như cũ.
Chỉ chép file JSON sang game đang giữ bộ phát cũ thì không hiển thị đường cong.
Bundle ghi `runtime.version: 2`, có source tương ứng; file HTML offline đã nhúng
đúng bản bộ phát mới, không cần chép thêm mã. Không thực thi source tùy ý từ
JSON; game nên import MJS do bạn kiểm soát.

## Các cách xuất

- `.map-project.json`: `format: darkin-map-v1`, map và ảnh nhúng để mở lại.
- `.map-bundle.json`: `format: darkin-map-bundle-v1`, chứa `project` và mã
  nguồn `runtime.source`. Đây không phải bundle nhân vật/cánh.
- `map-runtime.mjs`: bộ phát map độc lập, không phụ thuộc game gốc.
- `.map-preview.html`: web chạy thử có đủ ảnh và bộ phát, dùng được offline.

Nháp trong trình duyệt có hạn dung lượng; nếu báo đầy, tải project để giữ
bản sao. Nháp được lưu dưới khóa riêng `darkin.map.studio.v1`.

## Tích hợp vào game mới

Không đưa file map vào CutoutPlayer. Loader map và loader nhân vật tách riêng:

```js
import {DarkinMapPlayer} from './map-runtime.mjs';
const bundle = await fetch('/game-data/maps/forest.map-bundle.json').then(r => r.json());
const map = await DarkinMapPlayer.load(bundle); // Ảnh đã nhúng: không cần GitHub.
// Lighting đã lưu được đọc tự động. Muốn game đổi thời điểm:
// map.project.lighting = {...map.project.lighting, mode:'time', hour:22};
// Trong vòng lặp:
const warp = map.update(dt, inputX, inputY);
map.draw(ctx, width, height, {
  drawActor(ctx, actor) {
    characterPlayer.draw(ctx, actor.x, actor.y, 1);
  }
});
// Game cập nhật animation nhân vật riêng và xử lý warp.to / warp.at.
```

`drawActor` được gọi giữa các vật thể sắp theo chân, trong tọa độ thế giới đã
biến đổi camera; không áp camera thêm lần nữa. Vật thể lớp ground vẽ dưới
nhân vật, sorted theo Y chân, front luôn phía trước. Tán cây có giảm alpha
khi người thử đứng sau. Có viewport culling và cache tile nền giới hạn.

`canWalk(project,x,y,radius)` kiểm tra nước, vùng chặn và footprint vật thể;
`moveActor` chuẩn hóa tốc độ đi chéo và chia bước nhỏ chống xuyên vật cản.
`warpAt` trả mô tả cửa; game tự nạp map tiếp theo, chọn cửa đích và điểm spawn.
Game online phải dùng cùng dữ liệu kiểm tra va chạm ở server, không chỉ
clamp tọa độ vào biên map hoặc tin vị trí client gửi lên.

Giới hạn v1: tối đa 128×128 ô, 5000 vật thể, 1000 ảnh, 200 cửa; chưa có import
Tiled/LDtk, mesh terrain, địa hình cao thấp/cầu vượt nhiều tầng, NPC AI,
quest, combat, pathfinding tự động hoặc xuất cả thế giới nhiều map một lần.
