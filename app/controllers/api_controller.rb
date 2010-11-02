class ApiController < ApplicationController
  respond_to :json
  
  def time
    @response = {}
    @response["time"] = 0
    @response["direction"] = 0
    
    entry = Event.last
    if entry != nil
      @response["time"] = entry[:time]
      @response["direction"] = entry[:direction]
      if entry[:direction] == 1
        @response["time"] += (Time.now.to_i - entry[:created_at].to_i)
      elsif entry[:direction] == -1
        @response["time"] -= (Time.now.to_i - entry[:created_at].to_i)
      end
    end

    respond_with @response.to_json
  end

  def direction
    @entry = Event.new
    @entry[:time] = params[:time].to_i
    @entry[:direction] = params[:direction].to_i
    @entry.save
    
    respond_with do |format|
      format.json { render :json => @entry.to_json }      
    end
  end
end
