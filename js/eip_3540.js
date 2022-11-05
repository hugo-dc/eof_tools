const MAGIC = "EF00";
const VERSION = "01";
const S_TERMINATOR = "00";
const S_CODE = "01";
const S_DATA = "02";
const S_TYPE = "03";

function is_eof(code) {
  return code.substring(0, 4) == MAGIC;
}


