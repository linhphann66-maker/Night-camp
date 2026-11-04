// Shared, data-only names/categories for the catalog builder and editor.
export const MAP_PROP_CATEGORIES={all:'Tất cả tài nguyên',building:'Nhà & công trình',camp:'Lều & đồ cắm trại',decor:'Đồ trang trí / bàn / thùng',fence:'Hàng rào & cổng',lights:'Đèn & lửa trang trí',landmark:'Tượng / cột / vật thể cao',tree:'Cây',rock:'Đá / khoáng sản',bridge:'Cầu',plants:'Cỏ / hoa / bụi cây',custom:'Ảnh riêng'};
export const MAP_PROP_KINDS={tree:'Cây / vật che cao',house:'Nhà / công trình',tall:'Vật thể cao / tượng',post:'Đèn / cột / biển',fence:'Hàng rào / cổng',seat:'Ghế',fire:'Lửa trang trí (ảnh tĩnh)',rock:'Đá / vật rắn',bush:'Bụi cây',low:'Trang trí thấp',bridge:'Cầu',custom:'Vật thể riêng',ground:'Ô nền lặp'};
const words={cottage:'Nhà mái rơm',farmhouse:'Nhà nông trại',house:'Ngôi nhà',shroomhouse:'Nhà nấm',stilthouse:'Nhà sàn',stilthut:'Lều nhà sàn',hut:'Túp lều',shack:'Nhà gỗ nhỏ',cabin:'Nhà gỗ',inn:'Nhà trọ',warehouse:'Nhà kho',barn:'Nhà kho nông trại',granary:'Kho lương',windmill:'Cối xay gió',mill:'Nhà cối xay',stable:'Chuồng ngựa',shelter:'Mái trú',chapel:'Nhà nguyện',crypt:'Lăng mộ',castle:'Lâu đài',tower:'Tháp',lighthouse:'Hải đăng',tent:'Lều trại',roundtent:'Lều tròn',belltent:'Lều chuông',puptent:'Lều nhỏ',pavilion:'Lều lớn',tarp:'Mái bạt',wagon:'Xe ngựa',bedroll:'Túi ngủ',firebase:'Bệ lửa trại',fire:'Lửa trại',campfire:'Lửa trại',tripod:'Giá treo nồi',bench:'Ghế dài',table:'Bàn',crates:'Thùng gỗ',crate:'Thùng gỗ',barrels:'Thùng tô nô',barrel:'Thùng tô nô',sacks:'Bao hàng',sack:'Bao hàng',rack:'Giá treo',board:'Bảng thông báo',banner:'Cờ hiệu',sign:'Biển chỉ đường',dummy:'Hình nộm',fence:'Hàng rào',gate:'Cổng',arch:'Cổng vòm',lamp:'Đèn',lantern:'Đèn lồng',torch:'Đuốc',candles:'Nến',candle:'Nến',statue:'Tượng',totem:'Cột vật tổ',chest:'Rương trang trí',well:'Giếng',haystack:'Đống rơm',haybale:'Kiện rơm',haycart:'Xe chở rơm',boat:'Thuyền',boathouse:'Nhà thuyền',bridge:'Cầu',drawbridge:'Cầu kéo',tree:'Cây',tree2:'Cây tán rộng',oak:'Cây sồi',pine:'Cây thông',birch:'Cây bạch dương',fir:'Cây linh sam',rock:'Tảng đá',stone:'Đá lớn',stones:'Cụm đá',boulder:'Đá tảng',boulders:'Cụm đá tảng',crystal:'Tinh thể',crystals:'Cụm tinh thể',ore:'Quặng',bush:'Bụi cây',grass:'Cỏ',flowers:'Hoa',flower:'Hoa',log:'Khúc gỗ',woodpile:'Đống củi',stump:'Gốc cây',rug:'Thảm',spikes:'Bẫy gai trang trí',wall:'Tường'};
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
Object.assign(words,{lamppost:'Cột đèn',postlamp:'Đèn cột',brazier:'Lò than trang trí',candelabra:'Chân nến',bonfire:'Lửa lớn trang trí',beacon:'Đèn hiệu',kiln:'Lò nung',factory:'Nhà xưởng',manor:'Trang viên',scaffold:'Giàn giáo',archive:'Kho lưu trữ',bell:'Chuông',cave:'Cửa hang',cellar:'Cửa hầm',forge:'Lò rèn',altar:'Bàn thờ',shrine:'Miếu',falls:'Thác nước',silo:'Tháp chứa',shed:'Nhà kho nhỏ',tomb:'Lăng mộ',temple:'Đền',booth:'Quầy',stall:'Quầy hàng',cart:'Xe kéo',sawmill:'Xưởng cưa',bucket:'Xô',basket:'Giỏ',cauldron:'Vạc',flag:'Cờ',flags:'Cụm cờ',cage:'Lồng',cages:'Cụm lồng'});
export function matchesMapProp(a,q){return fold([a.name,a.id,a.sourceKind,MAP_PROP_CATEGORIES[a.category],a.searchTags].join(' ')).includes(fold(q).trim())}
export function mapPropCategory(id,kind){
 if(/bridge/.test(id)||kind==='bridge')return 'bridge';
 if(/(?:^|_)(?:lamp|lamppost|postlamp|lantern|torch|fire|firebase|candles?|brazier|candelabra|bonfire|beacon)(?:_|$)/.test(id)||kind==='fire')return 'lights';
 if(kind==='fence')return 'fence';
 if(/(?:^|_)(?:tent|roundtent|belltent|puptent|tarp|pavilion|bedroll)(?:_|$)/.test(id))return 'camp';
 if(kind==='house')return 'building';
 if(kind==='tree')return 'tree';
 if(/(?:^|_)(?:wagon|crates?|barrels?|sacks?|rack|board|bench|table|well|haystack|haybale|haycart|boat|chest|rug)(?:_|$)/.test(id)||kind==='seat')return 'decor';
 return kind==='rock'?'rock':kind==='bush'||kind==='low'?'plants':'landmark';
}
export function mapPropName(id,kind){
 const tokens=id.split('_');for(const token of tokens)if(words[token])return words[token];
 const stem=tokens.at(-1).replace(/\d+$/,'');return words[stem]||MAP_PROP_KINDS[kind]||'Vật trang trí';
}
