FightClock_private = {
  
};

TKObject.subClass("FightClock", {
  config: ["singleton"],
  init: function() {
    this.addProperty("direction", "integer", {
      defaultValue: 0
    });
    this.addProperty("time", "integer", {
      defaultValue: 0
    });
    this.addProperty("lastSync", "integer", {
      defaultValue: 0
    });
  },
  
  setDirection: function(value) {
    if (value > 0) {
      switch(this.direction) {
        case 1:
          this.direction = 0;
          break;
          
        case -1:
          this.direction = 2;
          break;
          
        case 2:
          this.direction = -1;
          break;
          
        default:
          this.direction = 1;
          break;
      }
    } else if (value < 0) {
      switch(this.direction) {
        case 1:
          this.direction = 2;
          break;
          
        case -1:
          this.direction = 0;
          break;
          
        case 2:
          this.direction = 1;
          break;
          
        default:
          this.direction = -1;
          break;
      }
    } else {
      this.direction = 0;
    }
    
    this.updateButtonState();
    
    if (! Object.isUndefined(this.timer)) {
      new Ajax.Request("/api/direction.json", {
        method: "POST",
        parameters: { "time":FightClock.getTime(), "direction":FightClock.getDirection() },
        onSuccess: function(transport) {
          TKTrace.log(transport.responseJSON);
        }
      });
    }
  },
  
  updateButtonState: function() {
    if (! Object.isUndefined(this.timer)) {
      switch(this.getDirection()) {
        case 1:
          $('minusButton').removeClassName("active");
          $('minusButton').addClassName("inactive");
          $('plusButton').removeClassName("inactive");
          $('plusButton').addClassName("active");
          break;
          
        case -1:
          $('minusButton').removeClassName("inactive");
          $('minusButton').addClassName("active");
          $('plusButton').removeClassName("active");
          $('plusButton').addClassName("inactive");
          break;
          
        // Special case for when both are active
        case 2:
          $('minusButton').removeClassName("inactive");
          $('minusButton').addClassName("active");
          $('plusButton').removeClassName("inactive");
          $('plusButton').addClassName("active");
          break;
          
        default:
          $('minusButton').removeClassName("active");
          $('minusButton').addClassName("inactive");
          $('plusButton').removeClassName("active");
          $('plusButton').addClassName("inactive");
          break;
      }
    }
  },
  
  updateTime: function() {
    switch(this.getDirection()) {
      case 1:
        this.setTime(this.getTime() + 1);
        break;
        
      case -1:
        this.setTime(this.getTime() - 1);
        break;
        
      default:
        // Do nothing
        break;
    }
    
    var sign = "";
    var remain = this.getTime();
    if (remain < 0) {
      sign = "-";
      remain = Math.abs(remain);
    }
    
    var hours = Math.floor(remain / 3600);
    remain -= (hours * 3600);
    var minutes = Math.floor(remain / 60);
    var seconds = remain - (minutes * 60);
    
    if (hours < 10) {
      hours = "0"+hours;
    }
    if (minutes < 10) {
      minutes = "0"+minutes;
    }
    if (seconds < 10) {
      seconds = "0"+seconds;
    }
    
    $('clock').update(sign+hours+":"+minutes+":"+seconds);
    
    // Sync every 10 seconds
    if (this.getLastSync() >= 10) {
      this.sync();
    }
    
    this.setLastSync(this.getLastSync() + 1);
  },
  
  sync: function() {
    new Ajax.Request("/api/time.json", {
      method: "GET",
      onSuccess: function(transport) {
        TKTrace.log("synced");
        this.setLastSync(0);
        
        var obj = transport.responseJSON;
        FightClock.setTime(obj.time);
        FightClock.direction = obj.direction;
        FightClock.updateButtonState();
      }.bind(this)
    });
  },
  
  start: function() {
    $('minusButton').onclick = function() {
      FightClock.setDirection(-1);
    };
    
    $('plusButton').onclick = function() {
      FightClock.setDirection(1);
    };
    
    FightClock.updateTime();
    this.timer = setInterval(FightClock.updateTime.bind(this), 1000);
    
    this.sync();
  }
});

TKTrace.setDebug(true);

document.observe("dom:loaded", function() {
  FightClock.start();
});
