// Ported from Python version:
// https://github.com/ipsilon/eof/blob/f7bccc2469b57302e1f354453656657c00c63819/eips_code/eip4750.py

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

function validate_eof(code) {
  var code_len = code.length / 2;
  // Check version
  if (code_len < 3 || byte_at(code, 2) != VERSION) {
    throw "invalid version";
  }

  // Process section headers
  var section_sizes = { "03": [], // S_TYPE 
                        "02": [], // S_CODE
                        "01": []  // S_DATA
  };

  var pos = 3;
  while (true) {
    // Terminator not found
    if (pos >= code_len) {
      throw "no section terminator";
    }

    var section_id = byte_at(code, pos);
    pos++;

    if (section_id == S_TERMINATOR) {
      break;
    }

    // Disallow unknown sections
    if (! section_id in section_sizes) {
      throw "invalid section id";
    }

    // Data section preceding code section (i.e. code section following data section)
    if (section_id == S_CODE && section_sizes[S_DATA] != 0) {
      throw "data section preceding code section";
    }

    // Code section or data section preceding type section
    if (section_id == S_TYPE && 
        (section_sizes[S_CODE].length != 0 || section_sizes[S_DATA].length != 0)) {
      throw "code or data section preceding type section";
    }
    
    // Multiple type or data sections
    if (section_id == S_TYPE && section_sizes[S_TYPE].length != 0) {
      throw "multiple type sections";
    }
    if (section_id == S_DATA && section_sizes[S_DATA].length != 0) {
      throw "multiple data sections";
    }

    // Truncated section size
    if ((pos + 1) >= code_len) {
      throw "truncated section size";
    }
    
    var section_size = parseInt(byte_at(code, pos) + byte_at(code, pos+1), 16);
    section_sizes[section_id].push(section_size);
    pos += 2;

    // Empty section
    if (section_size == 0) {
      throw "empty section";
    }
  }

  // Code section cannot be absent
  if (section_sizes[S_CODE].length == 0) {
    throw "no code section";
  }

  // Not more than 1024 code sections
  if (section_sizes[S_CODE].length > 1024) {
    throw "more than 1024 code sections";
  }

  // Type section can be absent only if single code section is present
  if (section_sizes[S_TYPE].length == 0 && section_sizes[S_CODE].length != 1) {
    throw "no obligatory type section";
  }

  // Type section, if present, has size corresponding to number of code sections
  if (section_sizes[S_TYPE].length != 0 && section_sizes[S_TYPE][0] != (section_sizes[S_CODE].length * 2)) {
    throw "invalid type section size";
  }

  // The entire container must be scanned
  var sections_size = pos + sum(section_sizes[S_TYPE]) + sum(section_sizes[S_CODE]) + sum(section_sizes[S_DATA]);
  if (code_len != sections_size) {
    throw "container size not equal to sum of section sizes";
  }

  // First type section, if present, has 0 inputs and 0 outputs
  if (section_sizes[S_TYPE].length > 0 && (byte_at(code, pos) != "00" || byte_at(code, pos+1) != "00")) {
    throw "invalid type of section 0";
  }
}
