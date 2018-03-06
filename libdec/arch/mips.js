/* 
 * Copyright (C) 2017-2018 deroad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

module.exports = (function() {

    var Base = require('./base');

    var op_bits4 = function(instr, op, bits, unsigned, swap) {
        var e = instr.parsed;
        var a = swap ? e[3] : e[2];
        var b = swap ? e[2] : e[3];
        if (e[2] == 'zero') {
            return Base.instructions.assign(e[1], e[3]);
        }
        if (bits) {
            //value, bits, is_signed, is_pointer, is_memory
            a = new Base.bits_argument(a, bits, false);
        }
        return op(e[1], a, b);
    };

    var _move = function(instr, bits, unsigned) {
        var e = instr.parsed;
        if (e[1] == 'zero') {
            return Base.instructions.nop();
        }
        if (e[2] == 'zero') {
            e[2] == '0';
        }
        // value, bits, is_signed, is_pointer, is_memory
        var reg = new Base.bits_argument(e[2], bits, false);
        return Base.instructions.assign(e[1], reg);
    };

    var load_bits = function(instr, bits, unsigned) {
        var e = instr.parsed;
        var s = unsigned ? "u" : "";
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            //pointer, register, bits, is_signed
            return Base.instructions.read_memory(arg[0], e[1], bits, !unsigned);
        } else if (arg[0] == '0') {
            //pointer, register, bits, is_signed
            return Base.instructions.read_memory(arg[1], e[1], bits, !unsigned);
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (!isNaN(arg[0])) {
            if (arg[0] < 0) {
                arg[0] = " - " + Math.abs(arg[0]);
            } else {
                arg[0] = " + " + arg[0];
            }
            return Base.instructions.read_memory(arg[1] + arg[0], e[1], bits, !unsigned);
        }
        return Base.instructions.read_memory(arg[1], e[1], bits, !unsigned);
    };

    var store_bits = function(instr, bits, unsigned) {
        var e = instr.parsed;
        var s = unsigned ? "u" : "";
        var arg = e[2].replace(/\)/, '').split('(');
        if (arg[1] == '0') {
            //pointer, register, bits, is_signed
            return Base.instructions.write_memory(arg[0], e[1], bits, !unsigned);
        } else if (arg[0] == '0') {
            //pointer, register, bits, is_signed
            return Base.instructions.write_memory(arg[1], e[1], bits, !unsigned);
        }
        arg[0] = parseInt(arg[0]) / (bits / 8);
        if (!isNaN(arg[0])) {
            if (arg[0] < 0) {
                arg[0] = " - " + Math.abs(arg[0]);
            } else {
                arg[0] = " + " + arg[0];
            }
            return Base.instructions.write_memory(arg[1] + arg[0], e[1], bits, !unsigned);
        }
        return Base.instructions.write_memory(arg[1], e[1], bits, !unsigned);
    };

    var compare = function(instr, context, instructions, cmp, zero) {
        instr.conditional(instr.parsed[1], zero ? "0" : instr.parsed[2], cmp);
        /*
        _delayed_branch (instr, context, instructions);
        */
        return Base.instructions.nop();
    };

    var _conditional_inline = function(instr, context, instructions, type) {
        instr.conditional(context.cond.a, context.cond.b, type);
        instr.jump = instructions[instructions.indexOf(instr) + 1].loc;
    };

    return {
        instructions: {
            'nop': function(instr) {
                return Base.instructions.nop();
            },
            'b': function(instr) {
                return Base.instructions.nop();
            },
            'lui': function(instr) {
                if (instr.parsed[2] != 'zero') {
                    if (instr.parsed[2].indexOf('0x') < 0) {
                        instr.parsed[2] = '0x' + instr.parsed[2];
                    }
                    instr.parsed[2] += "0000";
                }
                return _move(instr);
            },
            'move': function(instr) {
                return _move(instr);
            },
            'neg': function(instr) {
                var e = instr;
                if (e[2] == 'zero') {
                    e[2] = '0';
                }
                return Base.instructions.negate(e[1], e[2]);
            },
            'not': function(instr) {
                var e = instr.parsed;
                if (e[2] == 'zero') {
                    e[2] = '0';
                }
                return Base.instructions.not(e[1], e[2]);
            },
            'add': function(instr) {
                return op_bits4(instr, Base.instructions.add);
            },
            'addi': function(instr) {
                return op_bits4(instr, Base.instructions.add);
            },
            'addiu': function(instr) {
                return op_bits4(instr, Base.instructions.add);
            },
            'addu': function(instr) {
                return op_bits4(instr, Base.instructions.add);
            },
            'addis': function(instr) {
                if (instr.parsed[3].indexOf('0x') < 0) {
                    instr.parsed[3] = '0x' + instr.parsed[3];
                }
                instr.parsed[3] += '0000';
                return op_bits4(instr, Base.instructions.add);
            },
            'sub': function(instr) {
                return op_bits4(instr, Base.instructions.subtract, false, true);
            },
            'subc': function(instr) {
                return op_bits4(instr, Base.instructions.subtract, false, true);
            },
            'subf': function(instr) {
                return op_bits4(instr, Base.instructions.subtract, false, true);
            },
            'xor': function(instr) {
                return op_bits4(instr, Base.instructions.xor);
            },
            'xori': function(instr) {
                return op_bits4(instr, Base.instructions.xor);
            },
            'or': function(instr) {
                return op_bits4(instr, Base.instructions.or);
            },
            'ori': function(instr) {
                return op_bits4(instr, Base.instructions.or);
            },
            'oris': function(instr) {
                if (instr.parsed[3].indexOf('0x') < 0) {
                    instr.parsed[3] = '0x' + instr.parsed[3];
                }
                instr.parsed[3] += '0000';
                return op_bits4(instr, Base.instructions.or);
            },
            'and': function(instr) {
                return op_bits4(instr, Base.instructions.and);
            },
            'andi': function(instr) {
                return op_bits4(instr, Base.instructions.and);
            },
            'sll': function(instr) {
                return op_bits4(instr, Base.instructions.shift_left);
            },
            'sllv': function(instr) {
                return op_bits4(instr, Base.instructions.shift_left);
            },
            'sra': function(instr) {
                return op_bits4(instr, Base.instructions.shift_right);
            },
            'srl': function(instr) {
                return op_bits4(instr, Base.instructions.shift_right);
            },
            'srlv': function(instr) {
                return op_bits4(instr, Base.instructions.shift_right);
            },
            'slt': function(instr) {
                var e = instr.parsed;
                if (e[3] == 'zero') {
                    e[3] == '0';
                }
                return Base.instructions.conditional_assign(e[1], e[2], e[3], 'LT', '1', '0');
            },
            'slti': function(instr) {
                var e = instr.parsed;
                if (e[3] == 'zero') {
                    e[3] == '0';
                }
                return Base.instructions.conditional_assign(e[1], e[2], e[3], 'LT', '1', '0');
            },
            'sltiu': function(instr) {
                var e = instr.parsed;
                if (e[3] == 'zero') {
                    e[3] == '0';
                }
                //value, bits, is_signed, is_pointer, is_memory
                var arg0 = new Base.bits_argument(e[2], 32, false, false, false);
                var arg1 = new Base.bits_argument(e[3], 32, false, false, false);
                return Base.instructions.conditional_assign(e[1], arg0, arg1, 'LT', '1', '0');
            },
            'sltu': function(instr) {
                var e = instr.parsed;
                if (e[3] == 'zero') {
                    e[3] == '0';
                }
                //value, bits, is_signed, is_pointer, is_memory
                var arg0 = new Base.bits_argument(e[2], 32, false, false, false);
                var arg1 = new Base.bits_argument(e[3], 32, false, false, false);
                return Base.instructions.conditional_assign(e[1], arg0, arg1, 'LT', '1', '0');
            },
            lb: function(instr) {
                return load_bits(instr, 8, false);
            },
            lh: function(instr) {
                return load_bits(instr, 16, false);
            },
            lw: function(instr) {
                return load_bits(instr, 32, false);
            },
            sb: function(instr) {
                return store_bits(instr, 8, false);
            },
            sh: function(instr) {
                return store_bits(instr, 16, false);
            },
            sw: function(instr) {
                return store_bits(instr, 32, false);
            },
            lbu: function(instr) {
                return load_bits(instr, 8, true);
            },
            lhu: function(instr) {
                return load_bits(instr, 16, true);
            },
            lwu: function(instr) {
                return load_bits(instr, 32, true);
            },
            sbu: function(instr) {
                return store_bits(instr, 8, true);
            },
            shu: function(instr) {
                return store_bits(instr, 16, true);
            },
            swu: function(instr) {
                return store_bits(instr, 32, true);
            },
            'jr': function(instr, context, instructions) {
                if (instr.parsed.indexOf('ra') < 0) {
                    /*
                      _delayed_branch (instr, context, instructions);
                    */
                    return Base.instructions.return();
                }
                var reg = null;
                for (var i = instructions.length - 1; i >= 0; i--) {
                    var e = instructions[i].parsed;
                    if (!e) continue;
                    if (e.indexOf('v0') == 1 || e.indexOf('v1') == 1) {
                        reg = e[1];
                        break;
                    }
                };
                return Base.instructions.return(reg);
            },
            'jal': function(instr) {
                var fcn_name = instr.parsed[1].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                return Base.instructions.call(fcn_name);
            },
            'jalr': function(instr) {
                return Base.instructions.call(instr.parsed[1], [], true);
            },
            'bal': function(instr) {
                var fcn_name = instr.parsed[1].replace(/\./g, '_');
                if (fcn_name.indexOf('0x') == 0) {
                    fcn_name = fcn_name.replace(/0x/, 'fcn_');
                }
                return Base.instructions.call(fcn_name);
            },
            'beqz': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'NE', true);
            },
            'bnez': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'EQ', true);
            },
            'bltz': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'GE', true);
            },
            'blez': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'GT', true);
            },
            'bgtz': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'LE', true);
            },
            'bgez': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'LT', true);
            },
            'beq': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'NE', false);
            },
            'bne': function(instr, context, instructions) {
                return compare(instr, context, instructions, 'EQ', false);
            },
            invalid: function() {
                return Base.instructions.nop();
            }
        },
        parse: function(asm) {
            if (!asm) {
                return [];
            }
            return asm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null
                }
            }
        },
        delayed_branch: function(instructions) {

        },
        returns: function(context) {
            return 'void';
        }
    };
})();