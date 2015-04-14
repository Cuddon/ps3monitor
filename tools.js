/*----------------------------------------------------
    Utilities
----------------------------------------------------*/

// expose the class and constants to other modules
exports.getDateTime = getDateTime;
exports.mergeObjects = mergeObjects;


function getDateTime(){
    var dt = new Date();
    
    var month = dt.getMonth()+1;
    var day = dt.getDate();
    var year = dt.getFullYear();
    var hours = dt.getHours();
    var minutes = dt.getMinutes();
    var seconds = dt.getSeconds();
    var milliseconds = dt.getMilliseconds();
    
    return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds + '.' + milliseconds;
}


function mergeObjects(obj1,obj2) {
    /*
     * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
     * @param obj1
     * @param obj2
     * @returns obj3 a new object based on obj1 and obj2
     */
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

// tests
if(require.main === module) {
    console.log(getDateTime());

    a = {a:1, b:2};
    b = {a:3, c:'cat'};
    console.log(mergeObjects(a, b));
}
