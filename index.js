tf.enableProdMode()

const text2mel = tf.loadGraphModel('./fastspeech2_vi_tfjs/model.json');
const vocoder = tf.loadGraphModel('./vocoderjs/model.json');

const audioContext = new AudioContext();
async function playAudio(wav) {
    const buf = audioContext.createBuffer(1, wav.shape[1], 22050);
    buf.copyToChannel(await wav.data(), 0);
    var source = audioContext.createBufferSource();
    source.buffer = buf;
    source.connect(audioContext.destination);
    source.start();
}

const symbols = ['pad',
    '!',
    '/',
    "'",
    '(',
    ')',
    ',',
    '-',
    '.',
    ':',
    ';',
    '?',
    ' ',
    'a',
    '\u00e1',
    '\u1ea3',
    '\u00e0',
    '\u00e3',
    '\u1ea1',
    '\u00e2',
    '\u1ea5',
    '\u1ea9',
    '\u1ea7',
    '\u1eab',
    '\u1ead',
    '\u0103',
    '\u1eaf',
    '\u1eb3',
    '\u1eb1',
    '\u1eb5',
    '\u1eb7',
    'b',
    'c',
    'd',
    '\u0111',
    'e',
    '\u00e9',
    '\u1ebb',
    '\u00e8',
    '\u1ebd',
    '\u1eb9',
    '\u00ea',
    '\u1ebf',
    '\u1ec3',
    '\u1ec1',
    '\u1ec5',
    '\u1ec7',
    'f',
    'g',
    'h',
    'i',
    '\u00ed',
    '\u1ec9',
    '\u00ec',
    '\u0129',
    '\u1ecb',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    '\u00f3',
    '\u1ecf',
    '\u00f2',
    '\u00f5',
    '\u1ecd',
    '\u00f4',
    '\u1ed1',
    '\u1ed5',
    '\u1ed3',
    '\u1ed7',
    '\u1ed9',
    '\u01a1',
    '\u1edb',
    '\u1edf',
    '\u1edd',
    '\u1ee1',
    '\u1ee3',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    '\u00fa',
    '\u1ee7',
    '\u00f9',
    '\u0169',
    '\u1ee5',
    '\u01b0',
    '\u1ee9',
    '\u1eed',
    '\u1eeb',
    '\u1eef',
    '\u1ef1',
    'v',
    'w',
    'x',
    'y',
    '\u00fd',
    '\u1ef7',
    '\u1ef3',
    '\u1ef9',
    '\u1ef5',
    'eos'];

function symbolId(symbol) {
    return symbols.indexOf(symbol);
}

const curly_re = /(.*?)\{(.+?)\}(.*)/;

function cleanText(text) {
    text = textStandard(text);
    text = text.toLowerCase();
    text = expandAbbreviations(text);
    text = collapseWhitespace(text);
    return text;
};

function convertText(text) {
    let sequence = [];
    while (text.length != 0) {
        let m = text.match(curly_re);
        if (m == null) {
            sequence = sequence.concat(convertSymbols(cleanText(text)));
            break;
        }
        sequence = sequence.concat(convertSymbols(cleanText(m[1])));
        sequence = sequence.concat(convertArpabet(m[2]));
        text = m[3];
    }

    sequence = sequence.concat(symbolId("eos"));
    return sequence;
};

function convertSymbols(text) {
    if (typeof text == 'string') {
        text = text.split('');
    }
    return text.filter(keepSymbol).map(symbolId);
};

function convertArpabet(text) {
    return convertSymbols(text.split(/\s+/).map(char => "@" + char));
};

function keepSymbol(symbol) {
    return symbols.indexOf(symbol) != -1 && symbol != "_" && symbol != "~";
};

function isNumber(str) {
    return /^\d+$/.test(str);
};

function collapseWhitespace(text) {
    text.replace(/\s+/, " ");
    return text;
};

const abbreviations = {
    "tp": "thành phố ",
    "hcm": " hồ chí minh",
    "vn": "việt nam",
    "cmnd": "chứng minh nhân dân",
    "cccd": "căn cước công dân",
    "usd": "đô la mỹ",
    "bhxh": "bảo hiểm xã hội",
    "bhyt": "bảo hiểm y tế",
    "%": " phần trăm",
    "cskv": "cảnh sát khu vực",
    "tnhh": "trách nhiệm hữu hạn",
    "hđxx": "hội đồng xét xử",
    "sn": "sinh năm",
    "đn": " đà nẵng",
    "tcn": "trước công nguyên",
    "ubnd": "ủy ban nhân dân"
};

function expandAbbreviations(text) {
    for (const key of Object.keys(abbreviations)) {
        const val = abbreviations[key];
        text = text.replace(key, val);
    }
    return text;
};

const date_conn = /[-\/]/
var day_month_year = /^\d{2}[-\/]\d{2}[-\/]\d{4}/
var month_year = /^\d{2}[-\/]\d{4}/

function isDate(dateString) {
    var regEx = /^\d{2}[-\/]\d{2}[-\/]\d{4}|\d{2}[-\/]\d{4}|\d{2}[-\/]\d{2}/;
    return dateString.match(regEx) != null;
};

function convertToDate(date) {
    let d = date.split(date_conn)
    if (date.match(day_month_year) != null) {
        let dat = d[0] + ' tháng ' + d[1] + ' năm ' + d[2]
        return dat
    }
    else if (date.match(month_year) != null) {
        let dat = ' tháng ' + d[0] + ' năm ' + d[1]
        return dat
    }
    else {
        let dat = d[0] + ' tháng ' + d[1]
        return dat
    }
};

function textNorm(text) {
    var text = text.replace(/[&#,+()$~%.'":*?<>{}]/g, '')
    var list = text.split(' ')
    var newList = []
    for (let x = 0; x < list.length; x++ ) {
        if (isNumber(list[x]) == true) {
            result = VNnum2words(list[x])
            newList.push(result)
        }
        else if (isDate(list[x]) == true) {
            result = convertToDate(list[x])
            newList.push(result)
        }
        else {
            result = list[x]
            newList.push(result)
        }
    }
    string = newList.join(' ')
    return string
};

function textStandard(text) {
    var text = textNorm(text)
    var list = text.split(' ')
    var newList = []
    for (let x = 0; x < list.length; x++ ) {
        if (isNumber(list[x]) == true) {
            result = VNnum2words(list[x])
            newList.push(result)
        }
        else {
            result = list[x]
            newList.push(result)
        }
    }
    string = newList.join(' ')
    return string
};

async function tts(text, ttsStatus) {
    ttsStatus.innerText = "Converting input";
    const input_ids = tf.tensor([convertText(text)], null, 'int32');
    inputs = {
        "input_ids": input_ids,
        "speaker_ids": tf.tensor([0], null, 'int32'),
        "speed_ratios:0": tf.tensor([1.0], null, 'float32'),
        "f0_ratios": tf.tensor([1.0], null, 'float32'),
        "energy_ratios": tf.tensor([1.0], null, 'float32'),   
    
    };
    ttsStatus.innerText = "Generating mel spectrogram (be patient)";
    console.time("inference");
    console.time("mel generation");
    const mel = await (await text2mel).executeAsync(inputs);
    console.timeEnd("mel generation");
    console.time("vocoding");
    ttsStatus.innerText = "Generating waveform (be patient)";
    const wav = (await vocoder).execute(mel[1]);
    console.timeEnd("vocoding");
    console.timeEnd("inference");
    ttsStatus.innerText = "Done!";
    playAudio(wav);
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].dispose();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const ttsInput = document.getElementById("tts-input");
    const ttsStart = document.getElementById("tts-start");
    const ttsStatus = document.getElementById("tts-status");
    ttsStart.addEventListener("click", async function () {
        await tts(ttsInput.value, ttsStatus);
    });
});