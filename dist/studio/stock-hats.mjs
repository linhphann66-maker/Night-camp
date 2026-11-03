import {makeAttachment} from './attachments.mjs';
import {STOCK_HAT_BUILD,STOCK_HAT_FITS} from './stock-hat-fits.mjs';

// The packaged original profiles also protect against a cached GitHub catalog
// that predates this repair. Never apply one build's profile to another build.
export function resolveStockHat(entry,build=STOCK_HAT_BUILD){
 if(entry.category!=='hat'||build!==STOCK_HAT_BUILD)return entry;
 const profile=STOCK_HAT_FITS[entry.hatFitId||entry.id];
 if(!profile)return entry;
 const result={...entry};
 for(const key of ['dx','seat','fit','clip'])if(profile[key]!==undefined)result[key]=profile[key];
 return result;
}

// Explicit, undoable action ONLY for the selected library hat. Never silently
// rewrite an authored project, a custom upload, glasses, weapons or wings.
export function restoreLibraryHat(attachment,entry,headWidth){
 if(!attachment||!entry||entry.category!=='hat'||attachment.sourceId!==entry.id||attachment.socket!=='head'||attachment.wingRig)throw Error('Chọn một mũ có sẵn trong thư viện để khôi phục');
 const defaults=makeAttachment(entry,headWidth);
 const result={...attachment};
 for(const key of ['w','h','scale','rotation','anchor','x','y'])result[key]=structuredClone(defaults[key]);
 delete result.headFit;delete result.fitError;
 return result;
}
