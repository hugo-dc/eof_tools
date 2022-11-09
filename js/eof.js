const MAGIC = "EF00";
const VERSION = "01";
const S_TERMINATOR = "00";
const S_CODE = "01";
const S_DATA = "02";
const S_TYPE = "03";

var valid_opcodes = [];

valid_opcodes = addRange(valid_opcodes, [0x00, 0x0b + 1]);
valid_opcodes = addRange(valid_opcodes, [0x10, 0x1b + 1]);
valid_opcodes = addRange(valid_opcodes, [0x30, 0x3f + 1]);
valid_opcodes = addRange(valid_opcodes, [0x40, 0x48 + 1]);
valid_opcodes = addRange(valid_opcodes, [0x50, 0x5d + 1]);
valid_opcodes = addRange(valid_opcodes, [0x60, 0x6f + 1]);
valid_opcodes = addRange(valid_opcodes, [0x70, 0x7f + 1]);
valid_opcodes = addRange(valid_opcodes, [0x80, 0x8f + 1]);
valid_opcodes = addRange(valid_opcodes, [0x90, 0x9f + 1]);
valid_opcodes = addRange(valid_opcodes, [0xa0, 0xa4 + 1]);

// Note: 0xfe is considered assigned.
valid_opcodes = addRange(valid_opcodes, [0xf0, 0xf5 + 1]);

valid_opcodes.push(0xfa);
valid_opcodes.push(0xfd);
valid_opcodes.push(0xfe);
valid_opcodes.push(0xff);

const terminating_opcodes = [ 0x00, 0xf3, 0xfd, 0xfe, 0xff ];

const immediate_sizes = [];

for (var i=0; i < 256; i++) {
  if (i >= 0x60 && i <= (0x7f + 1)) {
    immediate_sizes[i] = i - 0x60 + 1;
  } else {
    immediate_sizes[i] = 0;
  }
}

immediate_sizes[0x5c] = 2;
immediate_sizes[0x5d] = 2;

// 3540
function is_eof(code) {
  return code.substring(0, 4) == MAGIC;
}

// 3670+4200
function validate_code(code) {
  if (code.length == 0) throw "code length cannot be 0";

  code = hex_string_to_bytes(code);

  var opcode = 0;
  var pos = 0;

  var rjumpdests = new Set();
  var immediates = new Set();

  while (pos < code.length) {
    // Ensure opcode is valid
    opcode = code[pos]
    pos++;

    if (valid_opcodes.findIndex(element => element == opcode) < 0) {
      throw "undefined instruction (" + opcode.toString(16) + ")";
    }

    if (opcode == 0x5c || opcode == 0x5d) {
      if (pos + 2 > code.length) {
        throw "truncated relative jump offset";
      }

      offset = int_from_bytes(code.slice(pos, pos+2));

      rjumpdest = pos + 2 + offset;
      if (rjumpdest < 0 || rjumpdest > code.length) {
        throw "relative jump destination out of bounds";
      }

      rjumpdests.add(rjumpdest);
    }

    // Save immediate value positions
    for (var i = pos; i < pos + immediate_sizes[opcode]; i++) {
      immediates.add(i);
    }

    pos += immediate_sizes[opcode];
  }

  // Ensure last opcode's immediate doesn't go over code end
  if (pos != code.length) {
    throw "truncated immediate";
  }

  // opcode is the *last opcode*
  if (terminating_opcodes.findIndex(element => element == opcode) < 0) {
    throw "no terminating instruction";
  }

  // Ensure relative jump destination don't target immeidates
  for (const elem of rjumpdests) {
    if (immediates.has(elem)) {
      throw "relative jump destination targets immediate";
    }
  }
}

// 3670
function is_valid_code(code) {
  try {
    validate_code(code);
    return true;
  } catch {
    return false;
  }
}

// 3540+3670+4750
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
