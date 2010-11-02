class Event < ActiveRecord::Base
  validates_presence_of :direction, :time
  
  def to_json(options = nil)
    self.serializable_hash()
  end
end
