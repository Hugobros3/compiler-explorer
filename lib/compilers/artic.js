// Copyright (c) 2016, Compiler Explorer Authors
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import path from 'path';

import { logger } from '../logger';
import _ from 'underscore';

import * as exec from '../exec';
import * as utils from '../utils';
import fs from 'fs-extra';

import { BaseCompiler } from '../base-compiler';

export class ArticCompiler extends BaseCompiler {
    static get key() { return 'artic'; }

    constructor(info, env) {
        super(info, env);
        //this.compiler.supportsIntel = true;
        this.compiler.supportsIrView = true;
        this.compiler.irArg = ['--emit-llvm'];
        //this.linker = this.compilerProps('linker');
    }

    getSharedLibraryPathsAsArguments() {
        return [];
    }

    optionsForFilter(filters, outputFilename, userOptions) {
	    let sliced = outputFilename.slice(0, -2);
        logger.info(outputFilename);
        logger.info(sliced);

        let stdlib = [
        '/home/hugo/anydsl-daily/runtime/platforms/artic/runtime.impala',
        '/home/hugo/anydsl-daily/runtime/platforms/artic/intrinsics_amdgpu.impala',
        '/home/hugo/anydsl-daily/runtime/platforms/artic/intrinsics_cpu.impala',
        '/home/hugo/anydsl-daily/runtime/platforms/artic/intrinsics_cuda.impala',
        '/home/hugo/anydsl-daily/runtime/platforms/artic/intrinsics_hls.impala',
        '/home/hugo/anydsl-daily/runtime/platforms/artic/intrinsics.impala',
        '/home/hugo/anydsl-daily/runtime/platforms/artic/intrinsics_nvvm.impala',
        '/home/hugo/anydsl-daily/runtime/platforms/artic/intrinsics_opencl.impala',
        '/home/hugo/anydsl-daily/runtime/platforms/artic/intrinsics_rv.impala',
        '/home/hugo/anydsl-daily/runtime/platforms/artic/intrinsics_thorin.impala',
        ];
        let options = ['-o', this.filename(sliced)].concat(stdlib);

        const userRequestedEmit = _.any(userOptions, opt => opt.includes('--emit'));
        if (filters.binary) {
            /*options = options.concat(['--crate-type', 'bin']);
            if (this.linker) {
                options = options.concat(`-Clinker=${this.linker}`);
            }*/
        } else if (!filters.binary) {
            /*if (!userRequestedEmit) {
                options = options.concat('--emit', 'asm');
            }
            if (filters.intel) options = options.concat('-Cllvm-args=--x86-asm-syntax=intel');
            options = options.concat(['--crate-type', 'rlib']);*/
        }
        return options;
    }

    async checkOutputFileAndDoPostProcess(asmResult, outputFilename, filters) {
        try {
            //let actualFilename = outputFilename + ".ll";
            //logger.info('actualFilename: '+actualFilename);
            //logger.info('outputFilename: '+outputFilename);
            //await this.exec("cp", [actualFilename, outputFilename], {});

            const stat = await fs.stat(outputFilename);
            logger.info('stat: '+stat);
            asmResult.asmSize = stat.size;
        } catch (e) {
	    logger.info(e);
            // Ignore errors
        }
        return this.postProcess(asmResult, outputFilename, filters);
    }

    async runCompiler(compiler, options, inputFilename, execOptions) {
        if (!execOptions) {
            execOptions = this.getDefaultExecOptions();
        }

        if (!execOptions.customCwd) {
            execOptions.customCwd = path.dirname(inputFilename);
        }

        const result = await this.exec(compiler, options, execOptions);
        result.inputFilename = inputFilename;
        const transformedInput = result.filenameTransform(inputFilename);
        result.stdout = utils.parseOutput(result.stdout, transformedInput);
        result.stderr = utils.parseOutput(result.stderr, transformedInput);

        const idx = options.indexOf('-o');
        const outputFilename = options[idx+1] + ".ll";
        logger.info('outputFilename>'+outputFilename);

        const llc_result = await this.exec("/home/hugo/anydsl-daily/llvm_build/bin/llc", [outputFilename, '-O3'], {});
        //result.stdout += utils.parseOutput(llc_result.stdout, transformedInput);
        //result.stderr += utils.parseOutput(llc_result.stderr, transformedInput);

        logger.info('beeee>');
	    logger.info(JSON.stringify(result));
        logger.info(llc_result.stderr);
        logger.info('beeee<');
        return result;
    }

    getIrOutputFilename(inputFilename) {
        return this.getOutputFilename(path.dirname(inputFilename), this.outputFilebase)
            .replace('.s', '.ll');
    }

    isCfgCompiler(/*compilerVersion*/) {
        return true;
    }

    /*getOutputFilename(dirPath, outputFilebase) {
        // NB keep lower case as ldc compiler `tolower`s the output name
        return path.join(dirPath, `${outputFilebase}.ll`);
    }*/
}
