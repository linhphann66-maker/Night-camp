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
autotile, ánh sáng hay shader nước của client gốc. Giữ seed để nền ổn định.

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
