set :application, "FightClock"
set :domain, "kangerlussuaq.homelinux.com"
set :repository, "git@github.com:iceydee/FightClock.git"
set :use_sudo, false
set :deploy_to, "/var/www/fightclock.eskipol.com"
set :deploy_via, :remote_cache
set :user, "mio"
set :scm, :git

role :web, domain
role :app, domain
role :db, domain, :primary => true

namespace :deploy do
  namespace :bundle do
    desc "Update dependencies using bundle"
    task :install, :roles => :app do
      run "cd #{current_release}; bundle install"
    end
  end
  
  task :start, :roles => :app do
    run "touch #{current_release}/tmp/restart.txt"
  end
  
  task :stop, :roles => :app do
    # Do nothing  
  end
  
  desc "Restart application"
  task :restart, :roles => :app, :except => { :no_release => true } do
    run "touch #{current_release}/tmp/restart.txt"
  end
end
