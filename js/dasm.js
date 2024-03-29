function valid_hex(data) {
  var hpattern = "^[0-9A-Fa-f]+$";
  return data.match(hpattern) ? true : false
}

function clean_data(data) {
  data = data.trim();
  data.replace(" ", "");

  if (data.substring(0, 2) == "0x") {
    data = data.substring(2, data.length);
  }

  data = data.toUpperCase();
  return data;
}

function consume(code, length) {
  var value = code.substring(0, length*2);
  code = code.substring(length*2, code.length);
  
  return [value, code];
}

function is_valid_eof(code) {
  if (is_eof(code)) { // EIP-3540
    validate_eof(code); // 4750
    return true;
  } else {
    return false;
  }
}

function get_types_io(code) {
  var io = [];
  var result;
  while (code.length > 0) {
    result = consume(code, 1);
    i = parseInt(result[0], 16);
    code = result[1];

    result = consume(code, 1);
    o = parseInt(result[0], 16);
    code = result[1];

    io.push([{"inputs" : i, "outputs": o}]);
  }
  return io;
}

function disassemble_eof(code) {
  try {
    if (is_valid_eof(code)) {
      var result;

      // Remove MAGIC
      result = consume(code, 2);
      code = result[1];

      // Get version
      result = consume(code, 1);
      var version = result[0];
      code = result[1];

      // Get section header
      var section_names = { "01": "Types", "02": "Code", "03": "Data" };
      var section_defs = [];
      result = consume(code, 1);
      var section = result[0]
      code = result[1];

      while (section != S_TERMINATOR) {
        result = consume(code, 2);
        var length = parseInt(result[0], 16);
        code = result[1];

        var sd = {};
        if (section == S_CODE) {
          sd[section_names[section]] = {};
          for (var i = 0; i < length; i++) {
            result = consume(code, 2);
            var code_len = parseInt(result[0], 16);
            code = result[1];
            sd[section_names[section]][i] = { "length" : code_len };
          }
        } else {
          sd[section_names[section]] = { "length" : length };
        }
        section_defs.push(sd);
        result = consume(code, 1);
        section = result[0];
        code = result[1];
      }

      // Get sections contents
      var sections = [];
      for (var i = 0; i < section_defs.length; i++) {
        var section = section_defs[i];
        var section_id = Object.keys(section)[0];

        if (section_id == "Code") {
          var sec_content = {};
          for (var j = 0; j < Object.keys(section[section_id]).length; j++) { 
            var code_len = section[section_id][j]['length'];
            result = consume(code, code_len);
            var content = result[0];
            code = result[1];

            var sec = {};
            sec_content[j] = {};
            sec_content[j]["length"] = code_len;
            sec_content[j]["code"] = content;
          }
          sec["Code"] = sec_content;
          sections.push(sec);

        } else {
          var section_len = section[section_id]['length'];
          
          result = consume(code, section_len);
          var content = result[0];
          code = result[1];

          var sec = {};
          var sec_content = {};
          sec_content["length"] = section_len;
          if (section_id == "Types") {
            sec_content["ios"] = get_types_io(content);
          } else {
            sec_content[section_id.toLowerCase()] = content;
          }
          sec[section_id] = sec_content;
          sections.push(sec);
        }
      }
      return {"version": version, "sections": sections};
    }
  } catch (err) {
    return { "error": "Error: " + err };
  }
}

function dasm() {
  var eof_bytecode = clean_data(document.getElementById("eof_bytecode").value);

  if (eof_bytecode.length == 0) {
    return;
  }

  if (!valid_hex(eof_bytecode)) {
    alert("EOF Bytecode is not a valid hex string");
    return;
  }

  if (eof_bytecode.length % 2 != 0 ) {
    alert("EOF Bytecode length cannot be odd");
    return;
  }

  var message = "";
  var result = disassemble_eof(eof_bytecode);

  if (result["error"] != undefined) {
  } else {
    // Validate code sections
    for (var i = 0; i < result["sections"].length; i++) {
      if (Object.keys(result["sections"][i])[0] == "Code") {
        for (var j = 0; j < Object.keys(result["sections"][i]["Code"]).length; j++) {
          var code = result["sections"][i]["Code"][j]["code"];
          try {
            validate_code(code)
          } catch (err) {
            message += "Error: " + err + " - code: " + code + "\n";
          }
        }
      }
    }
  }
  document.getElementById("result").innerText = JSON.stringify(result, null, 2);
  document.getElementById("message").innerText = message;
}
