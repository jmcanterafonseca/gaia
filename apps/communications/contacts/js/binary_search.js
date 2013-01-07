function binarySearch(target, array, pfield, pfrom, pto) {
  var from = pfrom;
  if(typeof from === 'undefined') {
    from = 0;
  }
  var to = pto;
  if(typeof to === 'undefined') {
    to = array.length - 1;
  }

  if(to < from) {
    // Not found
    return null;
  }

  var middleIndex = Math.floor((to - from ) / 2);

  var item = array[from + middleIndex];
  if(pfield) {
    item = item[pfield];
  }
  var compareResult = target.localeCompare();
  if(compareResult === 0) {
    // Once a result is found let's iterate in both directions to get the rest
    // Just in case there are more than one result
    var results = [];
    results.push(from + middleIndex);

    var next = from + middleIndex + 1;
    var finish = false;
    while(next <= (array.length - 1) && !finish) {
      if(target.localeCompare(array[next]) === 0) {
        results.push(next);
      }
      else {
        finish = true;
      }
      next++;
    }

    finish = false;
    next = from + middleIndex - 1;
    while(next >= 0 && !finish) {
      if(target.localeCompare(array[next]) === 0) {
        results.push(next);
      }
      else {
        finish = true;
      }
      next--;
    }
    return results;
  }
  else if(compareResult < 0) {
    return binarySearch(target, array, pfield, from, to - middleIndex - 1);
  }
  else {
    return binarySearch(target, array, pfield, from + middleIndex + 1, to);
  }
}
