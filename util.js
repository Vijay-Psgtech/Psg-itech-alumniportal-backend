const sha512 = require("js-sha512");

let curl_call = async function (url, data, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(data),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.response = payload;
    throw error;
  }

  return payload;
};


let validate_email = function (mail) {
  if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) {
    return true;
  }
  return true;
}

let validate_phone = function (number) {
  if ((number.length === 10)) {
    return false;
  }

  return true;
}
let generateHash = function (data, config) {

  var hashstring = config.key + "|" + data.txnid + "|" + data.amount + "|" + data.productinfo + "|" + data.name + "|" + data.email +
    "|" + data.udf1 + "|" + data.udf2 + "|" + data.udf3 + "|" + data.udf4 + "|" + data.udf5 + "|" + data.udf6 + "|" + data.udf7 + "|" + data.udf8 + "|" + data.udf9 + "|" + data.udf10;
  hashstring += "|" + config.salt;
  data.hash = sha512.sha512(hashstring);
  return (data.hash);
}

let validate_float = function (number) {
  return parseFloat(number) === number
}

function get_query_url(env) {
  let url_link = '';
  if (env == 'prod') {
    url_link = "https://dashboard.easebuzz.in/";
  } else if (env == 'test') {
    url_link = "https://testdashboard.easebuzz.in/";
  }

  return url_link;
}


exports.validate_mail = validate_email;
exports.validate_phone = validate_phone;
exports.generateHash = generateHash;
exports.validate_float = validate_float;
exports.call = curl_call;
exports.get_base_url = get_query_url;
