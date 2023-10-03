import { pipeline } from "@xenova/transformers";
import { MessageTypes } from "./presets.js";

class MyTranslationPipeline {
    static task = 'translation';
    static model = 'Xenova/nllb-200-distilled-600M';

    static instance = null;
    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback })
        }

        return this.instance
    }  
}

self.addEventListener('message', async (e) => {
    const {type, text, src_lang, tgt_lang} = e.data;
    if (type === MessageTypes.INFERENCE_REQUEST) {
        await translate(text, src_lang, tgt_lang)
    }
})

async function translate(text, src_lang, tgt_lang) {
    let translator = await MyTranslationPipeline.getInstance(x => {
        self.postMessage(x)
    })

    self.postMessage({
        type: MessageTypes.LOADING,
        status: 'LOADED'
    })

    // console.log('MODEL LOADED');
    let output = await translator(text, {
        tgt_lang: tgt_lang,
        src_lang: src_lang,
        callback_function: (x) => {
            self.postMessage({
                status: 'update',
                output: translator.tokenizer.decode(x[0].output_token_ids, {
                    skip_special_tokens: true
                })
            })
        }
    })
    
    self.postMessage({
        status: 'complete',
        output
    })
}

