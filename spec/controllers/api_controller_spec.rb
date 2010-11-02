require 'spec_helper'

describe ApiController do

  describe "GET 'time'" do
    it "should be successful" do
      get 'time'
      response.should be_success
    end
  end

  describe "GET 'direction'" do
    it "should be successful" do
      get 'direction'
      response.should be_success
    end
  end

end
