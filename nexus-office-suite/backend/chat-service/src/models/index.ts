import sequelize from '../config/database';
import User from './User';
import Channel from './Channel';
import Message from './Message';
import ChannelMember from './ChannelMember';
import ReadReceipt from './ReadReceipt';

// Define associations
User.hasMany(Channel, { foreignKey: 'createdBy', as: 'createdChannels' });
Channel.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Channel.hasMany(Message, { foreignKey: 'channelId', as: 'messages' });
Message.belongsTo(Channel, { foreignKey: 'channelId', as: 'channel' });

Channel.belongsToMany(User, {
  through: ChannelMember,
  foreignKey: 'channelId',
  otherKey: 'userId',
  as: 'members',
});

User.belongsToMany(Channel, {
  through: ChannelMember,
  foreignKey: 'userId',
  otherKey: 'channelId',
  as: 'channels',
});

Message.hasMany(Message, { foreignKey: 'parentId', as: 'replies' });
Message.belongsTo(Message, { foreignKey: 'parentId', as: 'parent' });

Message.hasMany(ReadReceipt, { foreignKey: 'messageId', as: 'readReceipts' });
ReadReceipt.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });

User.hasMany(ReadReceipt, { foreignKey: 'userId', as: 'readReceipts' });
ReadReceipt.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  sequelize,
  User,
  Channel,
  Message,
  ChannelMember,
  ReadReceipt,
};

export const syncDatabase = async (force = false): Promise<void> => {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};
