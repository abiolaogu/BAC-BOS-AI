import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { ChannelType, ChannelSettings } from '../types';

export class Channel extends Model {
  public id!: string;
  public name!: string;
  public description?: string;
  public type!: ChannelType;
  public isPrivate!: boolean;
  public createdBy!: string;
  public avatar?: string;
  public settings!: ChannelSettings;
  public lastMessageAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Channel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ChannelType)),
      allowNull: false,
      defaultValue: ChannelType.PUBLIC,
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        allowThreads: true,
        allowReactions: true,
        allowFileSharing: true,
        allowBots: false,
        muteNotifications: false,
      },
      allowNull: false,
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'channels',
    timestamps: true,
    indexes: [
      { fields: ['createdBy'] },
      { fields: ['type'] },
      { fields: ['isPrivate'] },
      { fields: ['lastMessageAt'] },
    ],
  }
);

export default Channel;
