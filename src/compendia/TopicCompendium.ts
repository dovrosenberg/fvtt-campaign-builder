import { Topic } from '@/types';

// class that works like a database table
export class TopicCompendium {
  topic: Topic;  // the topic
  pack: CompendiumCollection<Any>;
  
  constructor(topic: Topic, pack: CompendiumCollection<Any>) {
    this.topic = topic;
    this.pack = pack;    
  }


}