
/*
* PhoneNumberUtils
*
*/

var testdata = [{"mcc": 310, "number":'+18584458694'}, {"mcc":480, "number":'+8613891946675'}, {"mcc":404, "number":'+912234567890'}, {"mcc":208, "number":'+33237907600'}];

function test() {
  var butt = document.getElementById("getnuber");
  butt.onclick = function() {
    mcc = document.getElementById("mcc").value;
    inter_number = document.getElementById("inter_number").value;
    getParsedNumberAndShow(mcc, inter_number);
  }
  window.testPhoneNumberUtils = true;

  testData();
}

function getParsedNumberAndShow(mcc, inter_number) {
  PhoneNumberUtils.parseWithMCC(inter_number, mcc).then( pNumber => {
    var output = "Please input MCC and Phone number"
    if(mcc && inter_number){
      output = `National Number is ${pNumber.nationalNumber}\nThe MCC is from ${pNumber.countryName}`;
    }
    document.getElementById("output").innerHTML = output;
  })
}

function getParsedNumber(mcc, inter_number) {
  return new Promise( (resolve, reject) => {
    PhoneNumberUtils.parseWithMCC(inter_number, mcc).then( pNumber => {
      if(pNumber){
        resolve(pNumber);
      }else {
        reject();
      }
    })
  })
}

function testData() {
  var promise = [];
  var output ="";
  testdata.forEach( data => {
      promise.push(getParsedNumber(data.mcc, data.number))
    });
  Promise.all(promise).then(
    pNumbers => {
      pNumbers.forEach( pNumber =>{
      output += `National Number is ${pNumber.nationalNumber}\nThe MCC is from ${pNumber.countryName}\ncountryCode is ${pNumber.regionMetaData.countryCode}\n`;
    })
    document.getElementById("output").innerHTML = output;
  }).catch(reason => {
    console.log(reason)
    document.getElementById("output").innerHTML = 'Failed to parse number';
  })
}

test();
