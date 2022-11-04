function valid_hex(data) {
  var hpattern = "^[0-9A-Fa-f]+$";
  return data.match(hpattern) ? true : false
}

function clean_data(data) {
  data = data.trim();
  data.replace(" ", "");

  if (data.substring(0, 2) == "0x") {
    data = eof_data.substring(2, data.length);
  }

  return data;
}

function generate_eof(data, code) {
  const TERMINATOR = "00";
  const MAGIC = "ef0001";

  var code_len = code.length / 2;
  var data_len = data.length / 2;
  var code_len_hex = code_len.toString(16);
  var data_len_hex = data_len.toString(16);

  if (code_len_hex.length % 2 != 0 ) code_len_hex = "0" + code_len_hex;
  if (code_len_hex.length < 4) code_len_hex = "00" + code_len_hex

  var code_section = "01" + code_len_hex
  var data_section = ""

  if (data_len > 0) {
    if (data_len_hex.length % 2 != 0 ) data_len_hex = "0" + data_len_hex;
    if (data_len_hex.length < 4) data_len_hex = "00" + data_len_hex;
    data_section = "02" + data_len_hex;
  }

  return MAGIC + code_section + data_section + TERMINATOR + code + data;
}

function wrap() {
  var eof_data = clean_data(document.getElementById("eof_data").value);
  var evm_bytecode = clean_data(document.getElementById("evm_bytecode").value);

  if (eof_data.length != 0 && !valid_hex(eof_data)) {
    alert("Data is not a valid hex string");
    return;
  }

  if (eof_data.length % 2 != 0 ) {
    alert("Data length cannot be odd");
    return;
  }

  if (!valid_hex(evm_bytecode)) {
    alert("EVM bytecode is not a valid hex string");
    return;
  }

  if (evm_bytecode.length % 2 != 0 ) {
    alert("EVM bytecode length cannot be odd");
    return;
  }

  var eof_code = generate_eof(eof_data, evm_bytecode);
  document.getElementById("eof_code").innerText = eof_code;
}
