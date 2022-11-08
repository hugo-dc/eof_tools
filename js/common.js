
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

function sum(arr) {
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}


