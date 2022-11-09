
// Load data from URL
function loadData(defaultFunction) {
  const queryString = window.location.search; 
  const urlParams = new URLSearchParams(queryString);

  if (urlParams.has("eof")) {
    const eof_field = document.getElementById("eof_bytecode");
    eof_field.value = urlParams.get("eof");
    defaultFunction();
  }
}

function byte_at(code, str_offset) {
  var offset = str_offset * 2;
  return code.substring(offset, offset + 2);
}

function int_from_bytes(bts) {
  var bt1 = bts[0].toString(16);
  var bt2 = bts[1].toString(16);

  if (bt1.length != 2) bt1 = "0" + bt1;
  if (bt2.length != 2) bt2 = "0" + bt2;

  var result = 0;

  bt1_int = parseInt(bt1, 16);
  if (bt1_int < 0x80 ) {
    result = parseInt(bt1+bt2, 16); 
  } else {
    var a = parseInt(bt1+bt2, 16) - 32767; 
    result = (32769 - a) * -1;
  }

  return result;
}

function hex_string_to_bytes(hex_str) {
  var bytes = [];

  var pos = 0;
  for (var i = 0; i < (hex_str.length / 2); i++) {
    const bt = parseInt(byte_at(hex_str, i), 16)
    bytes.push(bt);
  }
  return bytes;
}

function sum(arr) {
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}

function addRange(arr, range) {
  if (range.length != 2) throw "invalid range";

  const from = range[0];
  const to = range[1];

  for (var i = from; i < to; i++) {
    arr.push(i);
  }

  return arr;
}
