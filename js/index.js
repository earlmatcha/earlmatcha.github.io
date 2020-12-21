const BUN_STATES = {
  IDLE : "_idle.gif",
  HOP : "_hop.gif",
  STAND : "_stand.gif",
};

// Month starts at 0
const DEFAULT_THEME_DATES = {
  'christmas' : {
    start : {
      month : 11,
      dayOfMonth : 1
    },
    end : {
      month : 11,
      dayOfMonth : 25
    }
  }
}

const BUN_WIDTH = BUN_HEIGHT = 60;
const BUN_MAX_DIST = 30;
const PROXIMITY = 30;
const TREAT_WIDTH = 32;
const MAX_IDLE = 30;
const MIN_IDLE = 5;
const SNOWFLAKE_MAX_DIST = 30;
const SNOWFLAKE_DIMENSIONS = 16;
var treatX;
var treatY;
var isMouseInPen = false;
var useDefaultTheme = true;
var spawnParticleCounter = 0;

$(document).ready(function() {
  var interval;
  var matcha = $('#matcha');
  var earl = $('#earl');
  var pen = $('#pen');
  var treat = $('#treat');
  var themes = $('#themes');

  placeBuns();
  render();
  interval = setInterval(render, 250);

  function placeBuns() {
    let penMinX = pen.offset().left;
    let penMinY = pen.offset().top;
    let penMaxX = penMinX + pen.width() - BUN_WIDTH;
    let penMaxY = penMinY + pen.height() - BUN_HEIGHT;

    matcha.css('left', (Math.floor(Math.random() * (penMaxX - penMinX)) + penMinX) + 'px');
    matcha.css('top', (Math.floor(Math.random() * (penMaxY - penMinY)) + penMinY) + 'px');
    matcha.show();
    setState(matcha, BUN_STATES.IDLE);

    earl.css('left', (Math.floor(Math.random() * (penMaxX - penMinX)) + penMinX) + 'px');
    earl.css('top', (Math.floor(Math.random() * (penMaxY - penMinY)) + penMinY) + 'px');
    earl.show();
    setState(earl, BUN_STATES.IDLE);

    while(bunsIntersect()) {
      earl.css('left', (Math.floor(Math.random() * (penMaxX - penMinX)) + penMinX) + 'px');
      earl.css('top', (Math.floor(Math.random() * (penMaxY - penMinY)) + penMinY) + 'px');
    }

    updateState(matcha);
    updateState(earl);
  }

  /* Debugging purposes */
  $(document).keypress(function(e) {
    if(e.which == 32) {
      if (!interval) {
        interval = setInterval(render, 250);
      }
      else {
        clearInterval(interval);
        interval = null;
      }
    }
  });

  pen.on('touchstart', function(event) {
    event.preventDefault();
    setTreatImage();
    treat.show();
    treatX = event.touches[0].clientX;
    treatY = event.touches[0].clientY;

    moveTreatTo(treatX, treatY);
    isMouseInPen = insidePen(treatX, treatY, 1, 1);
  });

  pen.on('touchmove', function(event) {
    treatX = event.touches[0].clientX;
    treatY = event.touches[0].clientY;

    moveTreatTo(treatX, treatY);
    isMouseInPen = insidePen(treatX, treatY, 1, 1);
    isMouseInPen ? treat.show() : treat.hide();
  });

  pen.on('touchend', function(event) {
    treat.hide();
    isMouseInPen = false;
  });

  pen.on('touchcancel', function(event) {
    console.log("touch canceled");
  });

  themes.on('change', function() {
    useDefaultTheme = false;
  });

  function render() {
    if (isMouseInPen) {
      resetState(matcha);
      resetState(earl);
      moveBunToMouse(matcha);
      moveBunToMouse(earl);
    }
    else {
      moveIdle(matcha);
      moveIdle(earl);
    }

    updateState(matcha);
    updateState(earl);

    renderTheme();
  }

  function moveBun(bun, point) {
    let offsetX = offsetY = 0;

    // Reset rotation so that top/left calculations work, otherwise use getBoundingClientRect
    bun.css('transform', 'rotate(0deg)');

    let bunPosition = bun.position();
    let bunCenter = {
      x : (bunPosition.left + BUN_WIDTH * 0.5),
      y : (bunPosition.top + BUN_HEIGHT * 0.5)
    };

    let bunDiffX = point.x - bunCenter.x;
    let bunDiffY = point.y - bunCenter.y;
    let hypotenuse = calculateHypotenuse(bunDiffX, bunDiffY);

    // Rotate bun to mouse
    let radians = Math.atan2(point.y - bunCenter.y, point.x - bunCenter.x)
    let angle = radians * 180 / Math.PI;

    // Move only if outside the distance
    if (Math.floor(hypotenuse) > PROXIMITY) {
      let maxTravelDist = hypotenuse - PROXIMITY;

      let adj = Math.cos(radians) * maxTravelDist;
      let opp = Math.sin(radians) * maxTravelDist;
      let bunTravelX = maxTravelDist < BUN_MAX_DIST ? adj : adj * (BUN_MAX_DIST / maxTravelDist);
      let bunTravelY = maxTravelDist < BUN_MAX_DIST ? opp : opp * (BUN_MAX_DIST / maxTravelDist);

      let newBunLeft = bunPosition.left + bunTravelX;
      let newBunTop = bunPosition.top + bunTravelY;

      bun.css('left', newBunLeft + 'px');
      bun.css('top', newBunTop + 'px');

      // Do not move if now buns overlap or move outside of the pen
      if (bunsIntersect() || !insidePen(newBunLeft, newBunTop, BUN_WIDTH, BUN_HEIGHT)) {
        bun.css('left', bunPosition.left + 'px');
        bun.css('top', bunPosition.top + 'px');
        resetState(bun);
      }
    }
    else {
      bun.data('inProximity', true);
      //setState(bun, BUN_STATES.STAND);
    }
    bun.css('transform', 'rotate(' + Math.floor(angle + 90) + 'deg)');
  }

  function moveBunToMouse(bun) {
    var mousePoint = {
      x : treatX,
      y : treatY
    }
    setState(bun, BUN_STATES.HOP);
    bun.data('inProximity', false);
    moveBun(bun, mousePoint);

    if (bun.data('inProximity')) {
      setState(bun, BUN_STATES.STAND);
    }
  }

  function moveIdle(bun) {
    if (bun.data('isMoving')) {
      moveBun(bun, bun.data('movingTo'));

      if (bun.data('inProximity') || bunsIntersect()) {
        bun.data('isMoving', false);
        bun.data('canMove', false);
      }
    }
    else if (bun.data('canMove')) {
      let penMinX = pen.offset().left;
      let penMinY = pen.offset().top;
      let penMaxX = penMinX + pen.width() - BUN_WIDTH;
      let penMaxY = penMinY + pen.height() - BUN_HEIGHT;

      var randomPoint = {
        x : Math.floor(Math.random() * (penMaxX - penMinX)) + penMinX,
        y : Math.floor(Math.random() * (penMaxY - penMinY)) + penMinY
      }
      moveBun(bun, randomPoint);
      bun.data('isMoving', true);
      bun.data('movingTo', randomPoint);
      setState(bun, BUN_STATES.HOP);
    }
    else {
      if (bun.data('idleTime') > 0) {
        bun.data('idleTime', bun.data('idleTime') - 1);

        if (bun.data('idleTime') == 0) {
          bun.data('canMove', true);
          bun.data('inProximity', false);
        }
      }
      else {
        let idleTime = Math.floor(Math.random() * MAX_IDLE) + MIN_IDLE;
        bun.data('idleTime', idleTime);
      }

      setState(bun, BUN_STATES.IDLE);
    }
  }

  function setState(bun, state) {
    bun.data('state', state);
  }

  function updateState(bun) {
    let state = bun.data('state');
    let bunId = bun.attr('id');
    let newState = getBunState(bunId, state);
    if (bun.data('prevState') !== newState) {
      bun.attr('src', getBunState(bunId, state));
    }
    bun.data('prevState', bun.attr('src'));
  }

  function resetState(bun) {
    bun.data('isMoving', false);
    bun.data('canMove', false);
    bun.data('inProximity', false);
  }

  function bunsIntersect() {
    let matcha = document.getElementById('matcha');
    let matchaRect = matcha.getBoundingClientRect();
    let earl = document.getElementById('earl');
    let earlRect = earl.getBoundingClientRect();

    return ((matchaRect.left < earlRect.left + earlRect.width)
      && (earlRect.left < matchaRect.left + matchaRect.width)
      && (matchaRect.top < earlRect.top + earlRect.height)
      && (earlRect.top < matchaRect.top + matchaRect.height));
  }

  function renderTheme() {
    let theme;
    let date = new Date();
    let month = date.getMonth();
    let dayOfMonth = date.getDate();

    // Use dropdown when no default exists
    if (!useDefaultTheme) {
      theme = themes.find(":selected").val();
    }
    else {
      // Check if current date is within any default date range
      for (defaultTheme in DEFAULT_THEME_DATES) {
        let currentDefaultTheme = DEFAULT_THEME_DATES[defaultTheme];
        if (month >= currentDefaultTheme.start.month && month <= currentDefaultTheme.end.month
            && dayOfMonth >= currentDefaultTheme.start.dayOfMonth && dayOfMonth <= currentDefaultTheme.end.dayOfMonth) {
          theme = defaultTheme;
          themes.val(theme);
        }
      }
    }

    // Can use switch
    if (theme == 'christmas') {
      pen.css('background-image', 'url("img/mat_christmas.png")');
      pen.css('background-color', 'none');
      if (spawnParticleCounter > 1) {
        spawnParticleCounter = 0;
      }

      processSnowflakes();
    }
    else {
      pen.css('background-image', 'none');
      pen.css('background-color', 'white');

      removeThemedParticles();
    }
  }

  function processSnowflakes() {
    // Spawn snowflake
    if (spawnParticleCounter == 0) {
      let newSnowflakePosition = 'style="left: ' + Math.random() * window.innerWidth + 'px; top: 0px;"';
      let newGifSrc = 'src="img/snowflake.gif?' + Math.random() + '" ';
      $('#particles').append('<img class="snowflake" ' + newGifSrc + newSnowflakePosition + '>');
    }

    spawnParticleCounter++;

    // Move all snowflakes and remove if exits window
    $('.snowflake').each(function() {
      let currentSnowflake = $(this);
      let currentPosition = currentSnowflake.position();
      // Snowflake can move left/right and down
      let snowflakeXDist = Math.random() * 2 * SNOWFLAKE_MAX_DIST - SNOWFLAKE_MAX_DIST;
      let snowflakeYDist = Math.random() * 2 * SNOWFLAKE_MAX_DIST;

      let snowflakeNewX = currentPosition.left + snowflakeXDist;
      let snowflakeNewY = currentPosition.top + snowflakeYDist;

      if ((snowflakeNewY + SNOWFLAKE_DIMENSIONS) > window.innerHeight
          || (snowflakeNewX + SNOWFLAKE_DIMENSIONS) > window.innerWidth
          || snowflakeNewX < 0) {
        currentSnowflake.remove();
      }
      else {
        currentSnowflake.css('left', snowflakeNewX);
        currentSnowflake.css('top', snowflakeNewY);
      }
    });
  }

  function removeThemedParticles() {
    $('.snowflake').each(function() {
      $(this).remove();
    });
  }
});

$(document).mousemove(function(event){
  // Only run for desktop
  if (matchMedia('(pointer:fine)').matches) {
    setTreatImage();
    let treat = $('#treat');
    treatX = event.pageX;
    treatY = event.pageY;

    moveTreatTo(treatX, treatY);
    isMouseInPen = insidePen(treatX, treatY, 1, 1);
    isMouseInPen ? treat.show() : treat.hide();
  }
});

function moveTreatTo(treatX, treatY) {
  let treat = $('#treat');
  treat.css('left', treatX - TREAT_WIDTH * 0.5);
  treat.css('top', treatY - TREAT_WIDTH * 0.5);
}

function setTreatImage() {
  let selectedTreat = $('#treats').find(":selected").val();
  let treat = $('#treat');
  treat.attr('src', 'img/' + selectedTreat + '.png');
}

function insidePen(x, y, width, height) {
  let pen = $('#pen');
  let penOffset = pen.offset();
  let penMinX = penOffset.left;
  let penMinY = penOffset.top;

  return (x > penMinX) && ((x + width) < (penMinX + pen.width()))
      && (y > penMinY) && ((y + height) < (penMinY + pen.height()));
}

function getBunState(bun, state) {
  return 'img/' + bun + state;
}

function calculateHypotenuse(a, b) {
  return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
}
