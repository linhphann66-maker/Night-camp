# Map runtime v8 — ánh sáng liên tục và mờ đúng vùng ảnh

Giữ format `darkin-map-v1` / `darkin-map-bundle-v1`; `runtime.version` mới là **8**.
Các map, ID vật thể, spawn, tương tác, collider, neo, kích thước và ảnh cũ không bị đổi.

## Nguyên nhân đã sửa trong bộ phát

- v7 đưa `nightness` (độ tối theo giờ) vào khóa cache của mỗi tile, ảnh tổng quan
  và texture đường cong. Khi đổi giờ, nó tính lại raster/noise trên CPU. Chia giờ
  thành từng nấc để tránh tính liên tục lại gây nhảy màu và vẫn khựng ở mỗi nấc.
- v8 chỉ tạo texture **ngày + đêm**, ghép hai lớp bằng alpha liên tục mỗi frame.
  Cùng màu/seed và đường đã vẽ; không tạo hàng loạt texture mới theo mốc giờ.
  Ảnh custom ground vẫn giữ màu ảnh gốc, chỉ nhận ánh sáng môi trường.
- Khi clock gửi theo nấc, phần trình bày chuyển dần tới ánh sáng mới (hằng số
  0,18 giây, không thêm/bớt giờ game). Đổi chế độ Ngày/Đêm thủ công vẫn áp dụng ngay.
  Canvas ánh sáng chỉ đổi kích thước khi viewport đổi, không cấp lại mỗi frame.
- Ảnh riêng có `assets[id].occlusionMask` (bitmask alpha tối đa 256×256, khoảng
  tối đa 11 KB). Lề trong suốt/lỗ trên tán không còn bị tính là che nhân vật.
  Mask được xuất cùng map nên không phụ thuộc canvas game có đọc được ảnh CDN hay không.
- Không cache vĩnh viễn kết quả rỗng khi ảnh chưa tải xong. Ảnh riêng chưa có
  mask và không đọc được alpha sẽ **không mờ theo hình chữ nhật**; cần xuất lại
  map để khôi phục đầy đủ việc mờ khi đứng đúng sau tán.
- `DarkinMapPlayer.draw(..., {actor})` dùng đúng actor game truyền vào; không
  ghi đè bằng actor thử/spawn nội bộ. Tọa độ phải là **chân trong thế giới map**,
  không phải tâm sprite, tọa độ màn hình hay tọa độ đã nhân zoom.

## Cập nhật game đang có

1. Mở map cũ trong Studio mới, chọn **Xuất map bundle + bộ phát** để có map kèm
   mask. Không cần đặt lại cây hay thay ID. Hoặc lưu project mới rồi xuất bundle.
2. Thay nguyên JSON map đang dùng và cập nhật `map-runtime.mjs` bằng
   `bundle.runtime.source` hoặc nút **Tải map-runtime.mjs** cùng phiên bản 8.
   Chỉ thay JSON mà giữ code v7 không sửa được lỗi dựng nền theo giờ.
3. Khi chuyển dữ liệu sang cấu trúc game, giữ **mọi trường của asset**, đặc biệt
   `occlusionMask`, `user`, `grounding`, `fadeBehind`, `ax/ay`, `w/h`, `src`.
   Đừng viết lại hàm mờ cây dựa trên bounding rectangle. Dùng renderer/runtime mới.
4. Xóa đoạn game tự `renderer.cache.clear()` hoặc tạo renderer mới khi đổi giờ.
   Chỉ xóa cache khi thay địa hình/nội dung/ảnh, không vì clock tick.
5. Truyền giờ có phần thập phân (giờ + phút/60 + giây/3600). Đừng dùng
   `Math.floor`, `toFixed`, làm tròn `nightness`, hoặc cập nhật ánh sáng chỉ ở mỗi
   nấc độ sáng. Không bật/tắt `day`/`night` theo hai trạng thái để mô phỏng bình minh.

```js
// Tạo player/renderer một lần khi vào map, không trong vòng lặp frame.
const mapPlayer = await DarkinMapPlayer.load(mapBundle, resolveAssetURL);

function frame(dt) {
  // timeOfDay từ đồng hồ game/server. Smoothing chỉ tác động hình ảnh.
  mapPlayer.setTimeOfDay(timeOfDayHours);
  // Game tự cập nhật nhân vật/combat bằng cơ chế đang có.
  mapPlayer.draw(ctx, viewportWidth, viewportHeight, {
    dt,                         // giây thực của frame, ví dụ 1/60
    zoom: cameraZoom,
    actor: {
      x: hero.feetX, y: hero.feetY,
      radius: hero.footRadius,   // đơn vị map, không nhân camera zoom
      occlusionHeight: hero.visibleHeight,
    },
    drawActor: () => drawHeroAtWorldFeet(ctx, hero),
  });
}
```

Nếu game dùng camera riêng, gọi `mapPlayer.renderer.draw(ctx, {x: cameraLeft,
y: cameraTop, zoom, width, height, actor, time: elapsedSeconds, dt, ...hooks})`.
Giữ nguyên hook skill dưới chân/trên người/sau ánh sáng. Nhân vật và mọi tọa độ
hook cùng hệ tọa độ map. `actor: null` tắt việc xét che người và không vẽ actor thử.
`setTimeOfDay(hour, {immediate: true})` chỉ dùng khi cần nhảy giờ ngay (ví dụ vừa
vào map), không gọi `immediate: true` mỗi frame.

Với ảnh external, vẫn tải `crossOrigin = 'anonymous'` **trước khi gán src** và
cấu hình CORS của máy chủ ảnh. Mask không gỡ hạn chế bảo mật của canvas và không
cho phép xuất ảnh từ canvas đã bị taint; nó chỉ tránh phải đọc alpha trong game.

## Prompt đưa Codex ở game mới

> Tích hợp nguyên map bundle mới và map-runtime v8 tôi gửi, giữ nguyên gameplay,
> ID map/vật thể, spawn quái, đào linh thạch, skill và multiplayer. Thay code v7
> bằng runtime.source trong bundle hoặc module v8; không chạy source bằng eval.
> Giữ occlusionMask/user/grounding/fadeBehind và hình học asset khi nhập. Bỏ cơ
> chế rebuild/xóa cache hoặc lượng tử hóa màu mỗi lần đổi giờ. Cập nhật giờ liên
> tục và truyền dt (giây) khi vẽ. Dùng đúng vị trí chân thực của hero để fade,
> không actor dummy, không nhân zoom vào x/y/radius/occlusionHeight. Dùng alpha
> mask của runtime, không bounding box của PNG. Kiểm tra bình minh/hoàng hôn
> trong khi vừa chạy vừa đánh; không được tính lại texture nền/đường vì giờ đổi.
> Kiểm tra đứng ngoài tán và trong lề trong suốt: cây không mờ; đứng sau phần tán
> thật: cây mờ; bước ra: hiện lại. Test cả ảnh riêng tải chậm, PNG có lề lớn và
> ảnh CDN. Không sửa collider, kích thước, điểm neo hay ID để chữa lỗi hiển thị.

Các kiểm tra này sửa phần runtime. Nếu game ngoài dự án còn có overlay ánh sáng,
lọc alpha cây hoặc cache riêng, cần thay đường tích hợp đó nữa; Studio không tự
cập nhật mã của game ở dự án khác.
