// A downloaded runtime and offline HTML must not retain a relative data import.
export function bundleMapRuntime(data,code){
 const dependency=/^import \{NATIVE_GROUNDS,NATIVE_MAPS,NATIVE_GROUND_BUILD\} from '\.\/native-ground\.mjs';\r?\n/m;
 if(!dependency.test(code))throw Error('Không nhận diện được phụ thuộc bảng màu của bộ phát');
 return data.replace(/^export /gm,'')+'\n'+code.replace(dependency,'');
}
