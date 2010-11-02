FightClock::Application.routes.draw do
  namespace :api do
    get "time", :format => :json
    post "direction", :format => :json
  end
end
