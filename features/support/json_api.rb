module JsonAPIHelpers
  def jsonGet(url)
    get url, :format => :json
    JSON.parse(response.body)
  end
  
  def idForNameInHash(name, hash)
    for entry in hash
      if entry["name"] == name
        return entry["id"]
      end
    end
    
    return nil
  end
end

World(JsonAPIHelpers)
